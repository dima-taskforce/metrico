import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWindowDto } from './dto/create-window.dto';
import { UpdateWindowDto } from './dto/update-window.dto';
import { CreateDoorDto } from './dto/create-door.dto';
import { UpdateDoorDto } from './dto/update-door.dto';
import type { WindowOpening, DoorOpening } from '@prisma/client';

@Injectable()
export class OpeningsService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyWallAccess(wallId: string, userId: string): Promise<void> {
    const wall = await this.prisma.wall.findUnique({
      where: { id: wallId },
      include: { room: { include: { project: { select: { userId: true } } } } },
    });
    if (!wall) throw new NotFoundException('Wall not found');
    if (wall.room.project.userId !== userId) {
      throw new ForbiddenException();
    }
  }

  // ─── Windows ─────────────────────────────────────────────────────────────

  async findAllWindows(wallId: string, userId: string): Promise<WindowOpening[]> {
    await this.verifyWallAccess(wallId, userId);
    return this.prisma.windowOpening.findMany({ where: { wallId } });
  }

  async createWindow(wallId: string, userId: string, dto: CreateWindowDto): Promise<WindowOpening> {
    await this.verifyWallAccess(wallId, userId);
    return this.prisma.windowOpening.create({ data: { wallId, ...dto } });
  }

  async updateWindow(
    wallId: string,
    windowId: string,
    userId: string,
    dto: UpdateWindowDto,
  ): Promise<WindowOpening> {
    await this.verifyWallAccess(wallId, userId);
    const window = await this.prisma.windowOpening.findUnique({ where: { id: windowId } });
    if (!window || window.wallId !== wallId) throw new NotFoundException('Window not found');
    return this.prisma.windowOpening.update({ where: { id: windowId }, data: dto });
  }

  async removeWindow(wallId: string, windowId: string, userId: string): Promise<void> {
    await this.verifyWallAccess(wallId, userId);
    const window = await this.prisma.windowOpening.findUnique({ where: { id: windowId } });
    if (!window || window.wallId !== wallId) throw new NotFoundException('Window not found');
    await this.prisma.windowOpening.delete({ where: { id: windowId } });
  }

  // ─── Doors ───────────────────────────────────────────────────────────────

  async findAllDoors(wallId: string, userId: string): Promise<DoorOpening[]> {
    await this.verifyWallAccess(wallId, userId);
    return this.prisma.doorOpening.findMany({ where: { wallId } });
  }

  async createDoor(wallId: string, userId: string, dto: CreateDoorDto): Promise<DoorOpening> {
    await this.verifyWallAccess(wallId, userId);
    return this.prisma.doorOpening.create({ data: { wallId, ...dto } });
  }

  async updateDoor(
    wallId: string,
    doorId: string,
    userId: string,
    dto: UpdateDoorDto,
  ): Promise<DoorOpening> {
    await this.verifyWallAccess(wallId, userId);
    const door = await this.prisma.doorOpening.findUnique({ where: { id: doorId } });
    if (!door || door.wallId !== wallId) throw new NotFoundException('Door not found');
    return this.prisma.doorOpening.update({ where: { id: doorId }, data: dto });
  }

  async removeDoor(wallId: string, doorId: string, userId: string): Promise<void> {
    await this.verifyWallAccess(wallId, userId);
    const door = await this.prisma.doorOpening.findUnique({ where: { id: doorId } });
    if (!door || door.wallId !== wallId) throw new NotFoundException('Door not found');
    await this.prisma.doorOpening.delete({ where: { id: doorId } });
  }
}
