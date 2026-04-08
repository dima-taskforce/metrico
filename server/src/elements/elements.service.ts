import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateElementDto } from './dto/create-element.dto';
import { UpdateElementDto } from './dto/update-element.dto';
import type { RoomElement } from '@prisma/client';

@Injectable()
export class ElementsService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyRoomAccess(roomId: string, userId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { project: { select: { userId: true } } },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.project.userId !== userId) throw new ForbiddenException();
  }

  async findAll(roomId: string, userId: string): Promise<RoomElement[]> {
    await this.verifyRoomAccess(roomId, userId);
    return this.prisma.roomElement.findMany({ where: { roomId } });
  }

  async create(roomId: string, userId: string, dto: CreateElementDto): Promise<RoomElement> {
    await this.verifyRoomAccess(roomId, userId);
    return this.prisma.roomElement.create({ data: { roomId, ...dto } });
  }

  async update(
    roomId: string,
    elementId: string,
    userId: string,
    dto: UpdateElementDto,
  ): Promise<RoomElement> {
    await this.verifyRoomAccess(roomId, userId);
    const element = await this.prisma.roomElement.findUnique({ where: { id: elementId } });
    if (!element || element.roomId !== roomId) throw new NotFoundException('Element not found');
    return this.prisma.roomElement.update({ where: { id: elementId }, data: dto });
  }

  async remove(roomId: string, elementId: string, userId: string): Promise<void> {
    await this.verifyRoomAccess(roomId, userId);
    const element = await this.prisma.roomElement.findUnique({ where: { id: elementId } });
    if (!element || element.roomId !== roomId) throw new NotFoundException('Element not found');
    await this.prisma.roomElement.delete({ where: { id: elementId } });
  }
}
