import { Injectable } from '@nestjs/common';
import type { Angle, Wall, WallSegment, DoorOpening, WindowOpening, Room } from '@prisma/client';

// ─── Internal types ───────────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

type SegmentWithOpenings = WallSegment & {
  windowOpening: WindowOpening | null;
  doorOpening: DoorOpening | null;
};

type WallWithSegments = Wall & {
  segments: SegmentWithOpenings[];
};

type RoomWithWalls = Room & {
  walls: WallWithSegments[];
};

// ─── Public types (re-exported via DTO) ──────────────────────────────────────

export interface RoomPlacement {
  roomId: string;
  /** Global x of room local origin, mm */
  x: number;
  /** Global y of room local origin, mm */
  y: number;
  /** Rotation in degrees (CW, screen coords) */
  rotation: number;
  /** Global polygon vertices in mm */
  polygon: Point[];
}

export interface AssemblyError {
  roomId: string;
  message: string;
}

export interface AssemblyResult {
  placements: RoomPlacement[];
  errors: AssemblyError[];
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class GeometryAssemblerService {
  /**
   * Build local polygons and assemble global floor plan via BFS
   * using DOOR/PASSAGE segments whose leadsToRoomId links rooms.
   *
   * Returns empty placements when no passage connections exist —
   * the frontend will fall back to its existing computeAutoLayout.
   */
  computeLayout(rooms: RoomWithWalls[], angles: Angle[]): AssemblyResult {
    const errors: AssemblyError[] = [];

    // Collect all segments that carry a leadsToRoomId
    let hasPassages = false;
    for (const room of rooms) {
      for (const wall of room.walls) {
        if (wall.segments.some((s) => s.leadsToRoomId)) {
          hasPassages = true;
          break;
        }
      }
      if (hasPassages) break;
    }

    if (!hasPassages) {
      return { placements: [], errors };
    }

    // ── Build local polygons ───────────────────────────────────────────────

    const polygons = new Map<string, Point[]>();

    for (const room of rooms) {
      const roomAngles = angles.filter((a) => a.roomId === room.id);
      try {
        const poly = this.buildRoomPolygon(room.walls, roomAngles);
        polygons.set(room.id, poly);
      } catch (e) {
        errors.push({
          roomId: room.id,
          message: `Не удалось построить полигон: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    // ── BFS placement ─────────────────────────────────────────────────────

    type Placement = { tx: number; ty: number; rotRad: number };

    const placements = new Map<string, Placement>();
    const placed = new Set<string>();
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    const firstRoom = rooms[0];
    if (!firstRoom) return { placements: [], errors };

    placements.set(firstRoom.id, { tx: 0, ty: 0, rotRad: 0 });
    placed.add(firstRoom.id);
    const queue: string[] = [firstRoom.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentRoom = roomMap.get(currentId);
      const currentPlacement = placements.get(currentId);
      const currentPolygon = polygons.get(currentId);
      if (!currentRoom || !currentPlacement || !currentPolygon) continue;

      const sortedWalls = [...currentRoom.walls].sort((a, b) => a.sortOrder - b.sortOrder);

      for (let wi = 0; wi < sortedWalls.length; wi++) {
        const wall = sortedWalls[wi]!;

        for (const seg of wall.segments) {
          if (!seg.leadsToRoomId) continue;
          const neighborId = seg.leadsToRoomId;
          if (placed.has(neighborId)) continue;

          const neighborRoom = roomMap.get(neighborId);
          const neighborPolygon = polygons.get(neighborId);
          if (!neighborRoom || !neighborPolygon) continue;

          // Find the back-link segment in neighbor
          let neighborSeg: SegmentWithOpenings | null = null;
          let neighborWall: WallWithSegments | null = null;

          for (const nw of neighborRoom.walls) {
            const found = nw.segments.find((s) => s.leadsToRoomId === currentId);
            if (found) {
              neighborSeg = found;
              neighborWall = nw;
              break;
            }
          }

          try {
            const p = this.computeNeighborPlacement(
              currentPlacement,
              currentPolygon,
              wall,
              wi,
              seg,
              neighborPolygon,
              neighborRoom,
              neighborWall,
              neighborSeg,
            );
            placements.set(neighborId, p);
            placed.add(neighborId);
            queue.push(neighborId);
          } catch (e) {
            errors.push({
              roomId: neighborId,
              message: `Ошибка позиционирования: ${e instanceof Error ? e.message : String(e)}`,
            });
          }
        }
      }
    }

    // ── Build output ──────────────────────────────────────────────────────

    const result: RoomPlacement[] = [];

    for (const room of rooms) {
      const p = placements.get(room.id);
      const localPoly = polygons.get(room.id);
      if (!p || !localPoly) continue;

      const globalPoly = localPoly.map((pt) =>
        this.transformPoint(pt, p.tx, p.ty, p.rotRad),
      );

      result.push({
        roomId: room.id,
        x: p.tx,
        y: p.ty,
        rotation: ((p.rotRad * 180) / Math.PI) % 360,
        polygon: globalPoly,
      });
    }

    return { placements: result, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Build a local CW polygon (screen coords, Y down) for a room.
   * Vertices are in mm, starting at (0,0) = first wall's start corner.
   * Walls are traversed in sortOrder. For each corner the exterior turn angle
   * is (π − interiorAngle). Right angles → π/2, reflex 270° → −π/2.
   */
  private buildRoomPolygon(walls: WallWithSegments[], angles: Angle[]): Point[] {
    if (walls.length === 0) return [];

    const sorted = [...walls].sort((a, b) => a.sortOrder - b.sortOrder);
    const polygon: Point[] = [];
    let x = 0;
    let y = 0;
    let dir = 0; // radians, starting East

    for (const wall of sorted) {
      polygon.push({ x, y });

      const lenMm = wall.length * 1000;
      x += lenMm * Math.cos(dir);
      y += lenMm * Math.sin(dir);

      // Find angle record for the end corner of this wall
      const cornerAngle = angles.find((a) => a.cornerLabel === wall.cornerTo);

      let turn: number;
      if (!cornerAngle || cornerAngle.isRightAngle) {
        turn = Math.PI / 2;
      } else if (cornerAngle.angleDegrees != null) {
        turn = Math.PI - (cornerAngle.angleDegrees * Math.PI) / 180;
      } else {
        turn = Math.PI / 2;
      }

      dir += turn;
    }

    return polygon;
  }

  /**
   * Compute where to place a neighbor room so that its passage segment
   * is exactly flush with ours (same global center, opposite outward normals).
   */
  private computeNeighborPlacement(
    current: { tx: number; ty: number; rotRad: number },
    currentPolygon: Point[],
    myWall: WallWithSegments,
    myWallIndex: number,
    mySeg: SegmentWithOpenings,
    neighborPolygon: Point[],
    neighborRoom: RoomWithWalls,
    neighborWall: WallWithSegments | null,
    neighborSeg: SegmentWithOpenings | null,
  ): { tx: number; ty: number; rotRad: number } {
    const pCount = currentPolygon.length;
    const myStart = currentPolygon[myWallIndex % pCount];
    const myEnd = currentPolygon[(myWallIndex + 1) % pCount];
    if (!myStart || !myEnd) throw new Error('Недопустимый индекс стены');

    const myWallDirLocal = Math.atan2(myEnd.y - myStart.y, myEnd.x - myStart.x);

    const myLocalCenter = this.getSegmentCenter(
      myWall.segments,
      mySeg.id,
      myStart,
      myWallDirLocal,
    );
    if (!myLocalCenter) throw new Error('Проходной сегмент не найден в стене');

    // Transform local center to global
    const globalCenter = this.transformPoint(
      myLocalCenter,
      current.tx,
      current.ty,
      current.rotRad,
    );

    // Outward normal of my wall in global coords (CW, Y-down: outward = dir − π/2)
    const myOutwardNormalGlobal = myWallDirLocal + current.rotRad - Math.PI / 2;

    if (!neighborWall || !neighborSeg) {
      // No back-link: approximate placement in front of opening
      return {
        tx: globalCenter.x,
        ty: globalCenter.y,
        rotRad: myOutwardNormalGlobal + Math.PI / 2,
      };
    }

    // Find neighbor wall index in sorted order
    const sortedNeighborWalls = [...neighborRoom.walls].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const nwi = sortedNeighborWalls.findIndex((w) => w.id === neighborWall.id);

    const nStart = neighborPolygon[nwi % neighborPolygon.length];
    const nEnd = neighborPolygon[(nwi + 1) % neighborPolygon.length];
    if (!nStart || !nEnd) throw new Error('Недопустимый индекс стены соседа');

    const neighborWallDirLocal = Math.atan2(nEnd.y - nStart.y, nEnd.x - nStart.x);
    const neighborOutwardNormalLocal = neighborWallDirLocal - Math.PI / 2;

    // Align normals: neighbor's global outward normal = my global outward + π
    // neighborOutwardNormalLocal + neighborRotation = myOutwardNormalGlobal + π
    const neighborRotation =
      myOutwardNormalGlobal + Math.PI - neighborOutwardNormalLocal;

    // Local center of neighbor's segment
    const neighborLocalCenter = this.getSegmentCenter(
      neighborWall.segments,
      neighborSeg.id,
      nStart,
      neighborWallDirLocal,
    );
    if (!neighborLocalCenter) throw new Error('Проходной сегмент не найден в стене соседа');

    // Offset of neighbor's center from its own origin, in global (after rotation)
    const cos = Math.cos(neighborRotation);
    const sin = Math.sin(neighborRotation);
    const offsetX = neighborLocalCenter.x * cos - neighborLocalCenter.y * sin;
    const offsetY = neighborLocalCenter.x * sin + neighborLocalCenter.y * cos;

    return {
      tx: globalCenter.x - offsetX,
      ty: globalCenter.y - offsetY,
      rotRad: neighborRotation,
    };
  }

  /**
   * Centre point of a specific segment along a wall, in local mm coords.
   * Segments sorted by sortOrder before accumulating offsets.
   */
  private getSegmentCenter(
    segments: SegmentWithOpenings[],
    targetId: string,
    wallStart: Point,
    wallDir: number,
  ): Point | null {
    const sorted = [...segments].sort((a, b) => a.sortOrder - b.sortOrder);
    let offset = 0;

    for (const seg of sorted) {
      if (seg.id === targetId) {
        const center = offset + (seg.length * 1000) / 2;
        return {
          x: wallStart.x + center * Math.cos(wallDir),
          y: wallStart.y + center * Math.sin(wallDir),
        };
      }
      offset += seg.length * 1000;
    }

    return null;
  }

  /** Rotate point around origin then translate. */
  private transformPoint(
    p: Point,
    tx: number,
    ty: number,
    rotRad: number,
  ): Point {
    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);
    return {
      x: tx + p.x * cos - p.y * sin,
      y: ty + p.x * sin + p.y * cos,
    };
  }
}
