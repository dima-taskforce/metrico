import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';
import type { WallSegment } from '@prisma/client';

@Injectable()
export class SegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyWallAccess(wallId: string, userId: string): Promise<{ length: number }> {
    const wall = await this.prisma.wall.findUnique({
      where: { id: wallId },
      include: { room: { include: { project: { select: { userId: true } } } } },
    });
    if (!wall) throw new NotFoundException('Wall not found');
    if ((wall as { room: { project: { userId: string } }; length: number }).room.project.userId !== userId) {
      throw new ForbiddenException();
    }
    return { length: wall.length };
  }

  async findAll(wallId: string, userId: string): Promise<WallSegment[]> {
    await this.verifyWallAccess(wallId, userId);
    return this.prisma.wallSegment.findMany({
      where: { wallId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(wallId: string, userId: string, dto: CreateSegmentDto): Promise<WallSegment> {
    await this.verifyWallAccess(wallId, userId);
    return this.prisma.wallSegment.create({ data: { wallId, ...dto } });
  }

  async update(
    wallId: string,
    segmentId: string,
    userId: string,
    dto: UpdateSegmentDto,
  ): Promise<WallSegment> {
    await this.verifyWallAccess(wallId, userId);
    const segment = await this.prisma.wallSegment.findUnique({ where: { id: segmentId } });
    if (!segment || segment.wallId !== wallId) throw new NotFoundException('Segment not found');
    return this.prisma.wallSegment.update({ where: { id: segmentId }, data: dto });
  }

  async remove(wallId: string, segmentId: string, userId: string): Promise<void> {
    await this.verifyWallAccess(wallId, userId);
    const segment = await this.prisma.wallSegment.findUnique({ where: { id: segmentId } });
    if (!segment || segment.wallId !== wallId) throw new NotFoundException('Segment not found');
    await this.prisma.wallSegment.delete({ where: { id: segmentId } });
  }

  async validate(wallId: string, userId: string): Promise<{ valid: boolean; delta: number; wallLength: number; segmentsSum: number }> {
    const { length: wallLength } = await this.verifyWallAccess(wallId, userId);
    const segments = await this.prisma.wallSegment.findMany({ where: { wallId } });
    const segmentsSum = segments.reduce((sum, s) => sum + s.length, 0);
    const delta = Math.round((segmentsSum - wallLength) * 1000) / 1000;
    return {
      valid: Math.abs(delta) < 0.001,
      delta,
      wallLength,
      segmentsSum,
    };
  }
}
