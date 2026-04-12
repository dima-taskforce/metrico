import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { PhotoType } from '@prisma/client';
import type { RoomPhoto } from '@prisma/client';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const THUMBNAIL_WIDTH = 400;

@Injectable()
export class PhotosService {
  private readonly uploadsDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadsDir = process.env['UPLOADS_DIR'] ?? path.join(process.cwd(), 'uploads');
  }

  private async verifyRoomAccess(roomId: string, userId: string): Promise<{ projectId: string }> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { project: { select: { userId: true, id: true } } },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.project.userId !== userId) throw new ForbiddenException();
    return { projectId: room.project.id };
  }

  private buildSubDir(userId: string, projectId: string, roomId: string): string {
    return path.join('photos', userId, projectId, roomId);
  }

  private async saveProcessed(
    file: Express.Multer.File,
    subDir: string,
    filename: string,
  ): Promise<string> {
    const dir = path.join(this.uploadsDir, subDir);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);

    await sharp(file.buffer)
      .rotate()                   // auto-orient from EXIF
      .withMetadata({ exif: {} }) // strip EXIF
      .jpeg({ quality: 85 })
      .toFile(filePath);

    return path.join('uploads', subDir, filename).replace(/\\/g, '/');
  }

  async findAll(roomId: string, userId: string): Promise<RoomPhoto[]> {
    await this.verifyRoomAccess(roomId, userId);
    return this.prisma.roomPhoto.findMany({ where: { roomId }, orderBy: { createdAt: 'asc' } });
  }

  async upload(
    roomId: string,
    userId: string,
    file: Express.Multer.File,
    photoType: PhotoType,
  ): Promise<RoomPhoto> {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported image format');
    }

    const { projectId } = await this.verifyRoomAccess(roomId, userId);
    const subDir = this.buildSubDir(userId, projectId, roomId);
    const name = crypto.randomBytes(16).toString('hex');

    const originalName = `${name}.jpg`;
    const thumbName = `${name}_thumb.jpg`;

    const [originalPath, thumbPath] = await Promise.all([
      this.saveProcessed(file, subDir, originalName),
      // thumbnail
      (async () => {
        const dir = path.join(this.uploadsDir, subDir);
        await fs.mkdir(dir, { recursive: true });
        await sharp(file.buffer)
          .rotate()
          .withMetadata({ exif: {} })
          .resize(THUMBNAIL_WIDTH)
          .jpeg({ quality: 75 })
          .toFile(path.join(dir, thumbName));
        return path.join('uploads', subDir, thumbName).replace(/\\/g, '/');
      })(),
    ]);

    return this.prisma.roomPhoto.create({ data: { roomId, photoType, originalPath, thumbPath } });
  }

  async remove(roomId: string, photoId: string, userId: string): Promise<void> {
    await this.verifyRoomAccess(roomId, userId);
    const photo = await this.prisma.roomPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.roomId !== roomId) throw new NotFoundException('Photo not found');

    await this.prisma.roomPhoto.delete({ where: { id: photoId } });

    // Delete original and thumbnail — guard against path traversal
    const uploadsRoot = path.resolve(this.uploadsDir);
    const originalFullPath = path.resolve(this.uploadsDir, photo.originalPath.replace(/^uploads\//, ''));
    if (!originalFullPath.startsWith(uploadsRoot + path.sep) && originalFullPath !== uploadsRoot) {
      throw new BadRequestException('Invalid file path');
    }
    await fs.unlink(originalFullPath).catch(() => undefined);
    if (photo.thumbPath) {
      const thumbFullPath = path.resolve(this.uploadsDir, photo.thumbPath.replace(/^uploads\//, ''));
      if (!thumbFullPath.startsWith(uploadsRoot + path.sep) && thumbFullPath !== uploadsRoot) {
        throw new BadRequestException('Invalid thumbnail path');
      }
      await fs.unlink(thumbFullPath).catch(() => undefined);
    }
  }
}
