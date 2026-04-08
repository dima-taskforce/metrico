import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ReorderRoomsDto } from './dto/reorder-rooms.dto';
import type { Room } from '@prisma/client';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async findAll(projectId: string, userId: string): Promise<Room[]> {
    await this.projects.findOne(projectId, userId);
    return this.prisma.room.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(projectId: string, roomId: string, userId: string): Promise<Room> {
    await this.projects.findOne(projectId, userId);
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.projectId !== projectId) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async create(projectId: string, userId: string, dto: CreateRoomDto): Promise<Room> {
    await this.projects.findOne(projectId, userId);
    return this.prisma.room.create({ data: { projectId, ...dto } });
  }

  async update(
    projectId: string,
    roomId: string,
    userId: string,
    dto: UpdateRoomDto,
  ): Promise<Room> {
    await this.findOne(projectId, roomId, userId);
    return this.prisma.room.update({ where: { id: roomId }, data: dto });
  }

  async remove(projectId: string, roomId: string, userId: string): Promise<void> {
    await this.findOne(projectId, roomId, userId);
    await this.prisma.room.delete({ where: { id: roomId } });
  }

  async reorder(projectId: string, userId: string, dto: ReorderRoomsDto): Promise<Room[]> {
    await this.projects.findOne(projectId, userId);

    const rooms = await this.prisma.room.findMany({ where: { projectId } });
    const existingIds = new Set(rooms.map((r) => r.id));

    for (const id of dto.orderedIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Room ${id} does not belong to this project`);
      }
    }

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.room.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    return this.prisma.room.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
