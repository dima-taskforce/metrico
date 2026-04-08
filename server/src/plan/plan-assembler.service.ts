import { Injectable } from '@nestjs/common';
import type { Room, Wall, Angle, WallSegment, WindowOpening, DoorOpening, RoomElement } from '@prisma/client';
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
type WallWithRelations = Wall & {
  segments: WallSegment[];
  windows: WindowOpening[];
  doors: DoorOpening[];
};

type RoomWithRelations = Room & {
  walls: WallWithRelations[];
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
    projectLabel: string,
    rooms: RoomWithRelations[],
    angles: Angle[],
    adjacencies: any[], // WallAdjacency with relations
  ): GetPlanDto {
    const floorPlanRooms = rooms.map((room) => this.assembleRoom(room, angles));

    const floorPlanAdjacencies = adjacencies.map((adj) =>
      this.assembleAdjacency(adj, rooms),
    );

    return {
      projectId,
      projectLabel,
      rooms: floorPlanRooms,
      adjacencies: floorPlanAdjacencies,
      generatedAt: new Date(),
    };
  }

  /**
   * Assemble single room with all stats, walls, elements.
   */
  private assembleRoom(room: RoomWithRelations, angles: Angle[]): FloorPlanRoom {
    const roomAngles = angles.filter((a) => a.roomId === room.id);

    const stats = this.roomsCalc.compute(
      room.walls,
      roomAngles,
      room.ceilingHeight,
      null,
    );

    return {
      id: room.id,
      label: room.label,
      perimeter: stats.perimeter,
      area: stats.area,
      volume: stats.volume,
      ceilingHeight: room.ceilingHeight,
      walls: room.walls.map((wall) => this.assembleWall(wall)),
      elements: room.elements ? room.elements.map((el) => this.assembleElement(el)) : [],
      curvatureMean: stats.curvatureAvg,
      curvatureStdDev: stats.curvatureDeviation,
    };
  }

  /**
   * Assemble wall with segments and openings.
   */
  private assembleWall(wall: WallWithRelations): FloorPlanWall {
    return {
      id: wall.id,
      roomId: wall.roomId,
      label: wall.label,
      length: wall.length,
      material: wall.material,
      wallType: wall.wallType,
      sortOrder: wall.sortOrder,
      segments: wall.segments ? wall.segments.map((seg) => this.assembleSegment(seg)) : [],
      openings: this.assembleOpenings(wall),
    };
  }

  /**
   * Assemble wall segment.
   */
  private assembleSegment(segment: WallSegment): FloorPlanSegment {
    return {
      id: segment.id,
      label: segment.label,
      length: segment.length, // metres
      segmentType: segment.segmentType,
    };
  }

  /**
   * Combine windows and doors from wall.
   */
  private assembleOpenings(wall: WallWithRelations): FloorPlanOpening[] {
    const openings: FloorPlanOpening[] = [];

    if (wall.windows && wall.windows.length > 0) {
      for (const win of wall.windows) {
        openings.push({
          id: win.id,
          label: win.label,
          type: 'WINDOW',
          width: win.width,
          height: win.height,
        });
      }
    }

    if (wall.doors && wall.doors.length > 0) {
      for (const door of wall.doors) {
        openings.push({
          id: door.id,
          label: door.label,
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
    return {
      id: element.id,
      label: element.label,
      elementType: element.elementType,
      depth: element.depth,
      x: element.positionX,
      y: element.positionY,
    };
  }

  /**
   * Assemble wall adjacency with label resolution.
   */
  private assembleAdjacency(adjacency: any, rooms: RoomWithRelations[]): FloorPlanAdjacency {
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
      wallALabel,
      wallBLabel,
      hasDoor: adjacency.hasDoorBetween,
      doorLabel: adjacency.doorOpening ? adjacency.doorOpening.label : undefined,
    };
  }
}
