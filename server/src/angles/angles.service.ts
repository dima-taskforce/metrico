import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAngleDto } from './dto/create-angle.dto';
import { UpdateAngleDto } from './dto/update-angle.dto';
import type { Angle } from '@prisma/client';

@Injectable()
export class AnglesService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyRoomAccess(roomId: string, userId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { project: { select: { userId: true } } },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.project.userId !== userId) throw new ForbiddenException();
  }

  async findAll(roomId: string, userId: string): Promise<Angle[]> {
    await this.verifyRoomAccess(roomId, userId);
    return this.prisma.angle.findMany({ where: { roomId } });
  }

  async create(roomId: string, userId: string, dto: CreateAngleDto): Promise<Angle> {
    await this.verifyRoomAccess(roomId, userId);
    return this.prisma.angle.create({
      data: {
        roomId,
        cornerLabel: dto.cornerLabel,
        wallAId: dto.wallAId,
        wallBId: dto.wallBId,
        ...(dto.isRightAngle !== undefined ? { isRightAngle: dto.isRightAngle } : {}),
        ...(dto.angleDegrees !== undefined ? { angleDegrees: dto.angleDegrees } : {}),
      },
    });
  }

  async update(
    roomId: string,
    angleId: string,
    userId: string,
    dto: UpdateAngleDto,
  ): Promise<Angle> {
    await this.verifyRoomAccess(roomId, userId);
    const angle = await this.prisma.angle.findUnique({ where: { id: angleId } });
    if (!angle || angle.roomId !== roomId) throw new NotFoundException('Angle not found');
    return this.prisma.angle.update({ where: { id: angleId }, data: dto });
  }

  async remove(roomId: string, angleId: string, userId: string): Promise<void> {
    await this.verifyRoomAccess(roomId, userId);
    const angle = await this.prisma.angle.findUnique({ where: { id: angleId } });
    if (!angle || angle.roomId !== roomId) throw new NotFoundException('Angle not found');
    await this.prisma.angle.delete({ where: { id: angleId } });
  }
}
