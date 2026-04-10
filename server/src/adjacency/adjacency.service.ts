import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateAdjacencyDto } from './dto/create-adjacency.dto';

@Injectable()
export class AdjacencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(projectId: string, dto: CreateAdjacencyDto, userId: string) {
    await this.projectsService.findOne(projectId, userId);
    // Fetch both walls
    const wallA = await this.prisma.wall.findUnique({
      where: { id: dto.wallAId },
      include: { room: true },
    });
    const wallB = await this.prisma.wall.findUnique({
      where: { id: dto.wallBId },
      include: { room: true },
    });

    if (!wallA || !wallB) {
      throw new NotFoundException('One or both walls not found');
    }

    // Verify both walls belong to the same project
    if (wallA.room.projectId !== projectId || wallB.room.projectId !== projectId) {
      throw new BadRequestException('Both walls must belong to the same project');
    }

    // Verify walls are from different rooms
    if (wallA.roomId === wallB.roomId) {
      throw new BadRequestException('Walls must belong to different rooms');
    }

    // Check for existing adjacency (both directions)
    const existingDirect = await this.prisma.wallAdjacency.findUnique({
      where: {
        wallAId_wallBId: {
          wallAId: dto.wallAId,
          wallBId: dto.wallBId,
        },
      },
    });
    const existingReverse = await this.prisma.wallAdjacency.findUnique({
      where: {
        wallAId_wallBId: {
          wallAId: dto.wallBId,
          wallBId: dto.wallAId,
        },
      },
    });

    if (existingDirect || existingReverse) {
      throw new ConflictException('Adjacency already exists between these walls');
    }

    // If hasDoorBetween is true, doorOpeningId must be provided
    if (dto.hasDoorBetween && !dto.doorOpeningId) {
      throw new BadRequestException(
        'doorOpeningId is required when hasDoorBetween is true',
      );
    }

    // Validate doorOpeningId if provided
    if (dto.doorOpeningId) {
      const doorOpening = await this.prisma.doorOpening.findUnique({
        where: { id: dto.doorOpeningId },
      });
      if (!doorOpening) {
        throw new NotFoundException('Door opening not found');
      }
    }

    return this.prisma.wallAdjacency.create({
      data: {
        wallAId: dto.wallAId,
        wallBId: dto.wallBId,
        projectId,
        hasDoorBetween: dto.hasDoorBetween,
        doorOpeningId: dto.doorOpeningId || null,
      },
      include: {
        wallA: true,
        wallB: true,
        doorOpening: true,
      },
    });
  }

  async findByProject(projectId: string, userId: string) {
    await this.projectsService.findOne(projectId, userId);
    return this.prisma.wallAdjacency.findMany({
      where: { projectId },
      include: {
        wallA: true,
        wallB: true,
        doorOpening: true,
      },
    });
  }

  async delete(adjacencyId: string, projectId: string, userId: string) {
    await this.projectsService.findOne(projectId, userId);

    const adjacency = await this.prisma.wallAdjacency.findUnique({
      where: { id: adjacencyId },
    });

    if (!adjacency || adjacency.projectId !== projectId) {
      throw new NotFoundException('Adjacency not found');
    }

    await this.prisma.wallAdjacency.delete({
      where: { id: adjacencyId },
    });
  }
}
