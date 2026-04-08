import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWallDto } from './dto/create-wall.dto';
import { UpdateWallDto } from './dto/update-wall.dto';
import type { Wall } from '@prisma/client';

@Injectable()
export class WallsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildLabel(cornerFrom: string, cornerTo: string): string {
    return `${cornerFrom}-${cornerTo}`;
  }

  private async verifyRoomAccess(roomId: string, userId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { project: { select: { userId: true } } },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.project.userId !== userId) throw new ForbiddenException();
  }

  private async verifyWallAccess(wallId: string, userId: string): Promise<Wall> {
    const wall = await this.prisma.wall.findUnique({
      where: { id: wallId },
      include: { room: { include: { project: { select: { userId: true } } } } },
    });
    if (!wall) throw new NotFoundException('Wall not found');
    if ((wall as Wall & { room: { project: { userId: string } } }).room.project.userId !== userId) {
      throw new ForbiddenException();
    }
    return wall;
  }

  async findAll(roomId: string, userId: string): Promise<Wall[]> {
    await this.verifyRoomAccess(roomId, userId);
    return this.prisma.wall.findMany({
      where: { roomId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(roomId: string, wallId: string, userId: string): Promise<Wall> {
    await this.verifyRoomAccess(roomId, userId);
    const wall = await this.prisma.wall.findUnique({ where: { id: wallId } });
    if (!wall || wall.roomId !== roomId) throw new NotFoundException('Wall not found');
    return wall;
  }

  async create(roomId: string, userId: string, dto: CreateWallDto): Promise<Wall> {
    await this.verifyRoomAccess(roomId, userId);
    const label = dto.label ?? this.buildLabel(dto.cornerFrom, dto.cornerTo);
    return this.prisma.wall.create({
      data: {
        roomId,
        label,
        cornerFrom: dto.cornerFrom,
        cornerTo: dto.cornerTo,
        length: dto.length,
        sortOrder: dto.sortOrder,
        ...(dto.material !== undefined ? { material: dto.material } : {}),
        ...(dto.wallType !== undefined ? { wallType: dto.wallType } : {}),
        ...(dto.curvatureBottom !== undefined ? { curvatureBottom: dto.curvatureBottom } : {}),
        ...(dto.curvatureMiddle !== undefined ? { curvatureMiddle: dto.curvatureMiddle } : {}),
        ...(dto.curvatureTop !== undefined ? { curvatureTop: dto.curvatureTop } : {}),
      },
    });
  }

  async update(wallId: string, userId: string, dto: UpdateWallDto): Promise<Wall> {
    const wall = await this.verifyWallAccess(wallId, userId);
    const label =
      dto.label ??
      (dto.cornerFrom !== undefined || dto.cornerTo !== undefined
        ? this.buildLabel(dto.cornerFrom ?? wall.cornerFrom, dto.cornerTo ?? wall.cornerTo)
        : undefined);

    return this.prisma.wall.update({
      where: { id: wallId },
      data: { ...dto, ...(label !== undefined ? { label } : {}) },
    });
  }

  async remove(wallId: string, userId: string): Promise<void> {
    await this.verifyWallAccess(wallId, userId);
    await this.prisma.wall.delete({ where: { id: wallId } });
  }
}
