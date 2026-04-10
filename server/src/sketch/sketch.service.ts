import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import type { RoomType, RoomShape } from '@prisma/client';

interface SketchNode {
  id: string;
  x: number;
  y: number;
}

interface SketchEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  wallId?: string;
  lengthM?: number;
}

interface SketchRoom {
  id: string;
  label: string;
  type: RoomType;
  edgeIds: string[];
  nodeIds: string[];
  roomId?: string;
}

interface SketchData {
  nodes: SketchNode[];
  edges: SketchEdge[];
  rooms: SketchRoom[];
}

@Injectable()
export class SketchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async saveSketch(
    projectId: string,
    userId: string,
    sketchJson: string,
  ): Promise<{ id: string }> {
    await this.projectsService.findOne(projectId, userId);

    const data = JSON.parse(sketchJson) as SketchData;
    this.validateSketch(data);

    const sketch = await this.prisma.floorPlanSketch.upsert({
      where: { projectId },
      update: { sketchJson },
      create: { projectId, sketchJson },
    });

    await this.syncRooms(projectId, data);

    return { id: sketch.id };
  }

  async getSketch(projectId: string, userId: string): Promise<string | null> {
    await this.projectsService.findOne(projectId, userId);
    const sketch = await this.prisma.floorPlanSketch.findUnique({
      where: { projectId },
    });
    return sketch?.sketchJson ?? null;
  }

  async deleteSketch(projectId: string, userId: string): Promise<void> {
    await this.projectsService.findOne(projectId, userId);
    await this.prisma.floorPlanSketch.deleteMany({ where: { projectId } });
  }

  private validateSketch(data: SketchData): void {
    const nodeIds = new Set(data.nodes.map((n) => n.id));
    for (const edge of data.edges) {
      if (!nodeIds.has(edge.fromNodeId)) {
        throw new BadRequestException(
          `Edge ${edge.id}: fromNodeId ${edge.fromNodeId} not found`,
        );
      }
      if (!nodeIds.has(edge.toNodeId)) {
        throw new BadRequestException(
          `Edge ${edge.id}: toNodeId ${edge.toNodeId} not found`,
        );
      }
    }
    const edgeIds = new Set(data.edges.map((e) => e.id));
    for (const room of data.rooms) {
      for (const eid of room.edgeIds) {
        if (!edgeIds.has(eid)) {
          throw new BadRequestException(
            `Room ${room.id}: edgeId ${eid} not found`,
          );
        }
      }
    }
  }

  private async syncRooms(projectId: string, data: SketchData): Promise<void> {
    for (let i = 0; i < data.rooms.length; i++) {
      const sr = data.rooms[i]!;
      if (sr.roomId) {
        await this.prisma.room.update({
          where: { id: sr.roomId },
          data: { name: sr.label, type: sr.type, sortOrder: i },
        });
      } else {
        const shape: RoomShape =
          sr.nodeIds.length === 4
            ? 'RECTANGLE'
            : sr.nodeIds.length === 6
              ? 'L_SHAPE'
              : sr.nodeIds.length === 8
                ? 'U_SHAPE'
                : 'CUSTOM';

        const room = await this.prisma.room.create({
          data: {
            projectId,
            name: sr.label,
            type: sr.type,
            shape,
            sortOrder: i,
          },
        });

        sr.roomId = room.id;

        // Создать стены из рёбер контура
        await this.createWallsFromEdges(room.id, sr, data);
      }
    }

    // Обновить sketchJson с новыми roomId
    await this.prisma.floorPlanSketch.update({
      where: { projectId },
      data: { sketchJson: JSON.stringify(data) },
    });
  }

  private async createWallsFromEdges(
    roomId: string,
    sketchRoom: SketchRoom,
    data: SketchData,
  ): Promise<void> {
    const cornerLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nodeCount = sketchRoom.nodeIds.length;

    for (let i = 0; i < sketchRoom.edgeIds.length; i++) {
      const edgeId = sketchRoom.edgeIds[i]!;
      const edge = data.edges.find((e) => e.id === edgeId);
      const cornerFrom = cornerLabels[i % cornerLabels.length] ?? 'A';
      const cornerTo = cornerLabels[(i + 1) % nodeCount] ?? 'B';

      await this.prisma.wall.create({
        data: {
          roomId,
          label: `${cornerFrom}-${cornerTo}`,
          cornerFrom,
          cornerTo,
          length: edge?.lengthM ?? 0,
          material: 'CONCRETE',
          wallType: 'INTERNAL',
          sortOrder: i,
        },
      });
    }
  }
}
