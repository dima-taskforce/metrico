import { Injectable } from '@nestjs/common';
import type { Room, Wall, Angle, WallSegment, WallAdjacency, DoorOpening, WindowOpening, RoomElement } from '@prisma/client';
import { RoomsCalcService } from '../rooms/rooms-calc.service';
import {
  FloorPlanRoom,
  FloorPlanWall,
  FloorPlanSegment,
  FloorPlanOpening,
  FloorPlanElement,
  FloorPlanAdjacency,
  GetPlanDto,
} from './dto/get-plan.dto';

/**
 * Extended types to include relations
 */
type SegmentWithOpenings = WallSegment & {
  windowOpening: WindowOpening | null;
  doorOpening: DoorOpening | null;
};

type WallWithSegmentsAndOpenings = Wall & {
  segments: SegmentWithOpenings[];
};

type RoomWithWalls = Room & {
  walls: WallWithSegmentsAndOpenings[];
  elements: RoomElement[];
};

type AdjacencyWithDoor = WallAdjacency & {
  doorOpening: DoorOpening | null;
};

@Injectable()
export class PlanAssemblerService {
  constructor(private roomsCalc: RoomsCalcService) {}

  /**
   * Assemble complete floor plan from project data.
   * Combines geometry, segments, openings, and elements into single structure.
   */
  assembleFloorPlan(
    projectId: string,
    projectName: string,
    rooms: RoomWithWalls[],
    angles: Angle[],
    adjacencies: AdjacencyWithDoor[],
  ): GetPlanDto {
    const floorPlanRooms = rooms.map((room) => this.assembleRoom(room, angles));

    const floorPlanAdjacencies = adjacencies.map((adj) =>
      this.assembleAdjacency(adj, rooms),
    );

    return {
      projectId,
      projectLabel: projectName,
      rooms: floorPlanRooms,
      adjacencies: floorPlanAdjacencies,
      generatedAt: new Date(),
    };
  }

  /**
   * Assemble single room with all stats, walls, elements.
   */
  private assembleRoom(room: RoomWithWalls, angles: Angle[]): FloorPlanRoom {
    const roomAngles = angles.filter((a) => a.roomId === room.id);

    // Use average ceiling height if two values exist
    const ceilingHeight = room.ceilingHeight1 || room.ceilingHeight2 || null;

    const stats = this.roomsCalc.compute(
      room.walls,
      roomAngles,
      ceilingHeight,
      null,
    );

    return {
      id: room.id,
      label: room.name, // Room.name is used as label
      perimeter: stats.perimeter,
      area: stats.area,
      volume: stats.volume,
      ceilingHeight: ceilingHeight,
      walls: room.walls.map((wall) => this.assembleWall(wall)),
      elements: room.elements.map((el) => this.assembleElement(el)),
      curvatureMean: stats.curvatureMean,
      curvatureStdDev: stats.curvatureStdDev,
    };
  }

  /**
   * Assemble wall with segments and openings.
   */
  private assembleWall(wall: WallWithSegmentsAndOpenings): FloorPlanWall {
    return {
      id: wall.id,
      roomId: wall.roomId,
      label: wall.label,
      length: wall.length,
      material: wall.material,
      wallType: wall.wallType,
      sortOrder: wall.sortOrder,
      segments: wall.segments.map((seg) => this.assembleSegment(seg)),
      openings: this.assembleOpenings(wall),
    };
  }

  /**
   * Assemble wall segment.
   */
  private assembleSegment(segment: SegmentWithOpenings): FloorPlanSegment {
    // Generate label from segment type
    const label = segment.description || `${segment.segmentType}-${segment.sortOrder}`;
    return {
      id: segment.id,
      label,
      length: segment.length, // metres
      segmentType: segment.segmentType,
      leadsToRoomId: segment.leadsToRoomId ?? null,
    };
  }

  /**
   * Combine windows and doors from wall segments using joined relation data.
   */
  private assembleOpenings(wall: WallWithSegmentsAndOpenings): FloorPlanOpening[] {
    const openings: FloorPlanOpening[] = [];

    for (const segment of wall.segments) {
      if (segment.segmentType === 'WINDOW' && segment.windowOpening) {
        const win = segment.windowOpening;
        openings.push({
          id: win.id,
          label: `Window ${segment.sortOrder}`,
          type: 'WINDOW',
          width: win.width,
          height: win.height,
        });
      } else if (segment.segmentType === 'DOOR' && segment.doorOpening) {
        const door = segment.doorOpening;
        openings.push({
          id: door.id,
          label: `Door ${segment.sortOrder}`,
          type: 'DOOR',
          width: door.width,
          height: door.heightFromScreed,
        });
      }
    }

    return openings;
  }

  /**
   * Assemble room element (column, radiator, etc).
   */
  private assembleElement(element: RoomElement): FloorPlanElement {
    // Generate label from element type and description
    const label = element.description || element.cornerLabel || `${element.elementType}`;
    return {
      id: element.id,
      label,
      elementType: element.elementType,
      depth: element.depth ?? 0,
      x: element.positionX ?? 0,
      y: element.offsetFromWall ?? 0,
    };
  }

  /**
   * Assemble wall adjacency with label resolution.
   */
  private assembleAdjacency(adjacency: AdjacencyWithDoor, rooms: RoomWithWalls[]): FloorPlanAdjacency {
    // Find wall labels by ID from rooms
    let wallALabel = '';
    let wallBLabel = '';

    for (const room of rooms) {
      const wallA = room.walls.find((w) => w.id === adjacency.wallAId);
      const wallB = room.walls.find((w) => w.id === adjacency.wallBId);
      if (wallA) wallALabel = wallA.label;
      if (wallB) wallBLabel = wallB.label;
    }

    return {
      id: adjacency.id,
      wallAId: adjacency.wallAId,
      wallBId: adjacency.wallBId,
      wallALabel,
      wallBLabel,
      hasDoor: adjacency.hasDoorBetween,
      ...(adjacency.doorOpening ? { doorLabel: adjacency.doorOpening.id } : {}),
    };
  }
}
