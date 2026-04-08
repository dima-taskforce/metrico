import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class FileStorageService {
  private readonly uploadsDir: string;

  constructor() {
    this.uploadsDir = process.env['UPLOADS_DIR'] ?? path.join(process.cwd(), 'uploads');
  }

  async save(file: Express.Multer.File, subDir: string): Promise<string> {
    const dir = path.join(this.uploadsDir, subDir);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const filePath = path.join(dir, name);

    await fs.writeFile(filePath, file.buffer);
    return path.join('uploads', subDir, name).replace(/\\/g, '/');
  }

  async delete(relativePath: string): Promise<void> {
    const fullPath = path.join(process.cwd(), relativePath);
    await fs.unlink(fullPath).catch(() => undefined);
  }

  /**
   * Copy blueprint file from one project to another.
   * Returns new relative file path.
   */
  async copyBlueprintFile(
    srcProjectId: string,
    dstProjectId: string,
    srcRelPath: string,
  ): Promise<string> {
    const filename = path.basename(srcRelPath);
    const dstSubDir = `projects/${dstProjectId}/blueprint`;
    const dstDir = path.join(this.uploadsDir, dstSubDir);
    await fs.mkdir(dstDir, { recursive: true });
    await fs.copyFile(
      path.join(process.cwd(), srcRelPath),
      path.join(dstDir, filename),
    );
    return path.join('uploads', dstSubDir, filename).replace(/\\/g, '/');
  }

  /**
   * Copy all room photo files from source project to destination project.
   * roomIdMap: oldRoomId → newRoomId
   * Returns: oldFilePath → newFilePath (relative paths)
   */
  async copyProjectFiles(
    srcProjectId: string,
    dstProjectId: string,
    userId: string,
    roomIdMap: Record<string, string>,
  ): Promise<Record<string, string>> {
    const filePathMap: Record<string, string> = {};

    for (const [srcRoomId, dstRoomId] of Object.entries(roomIdMap)) {
      const srcRoomDir = path.join(this.uploadsDir, 'photos', userId, srcProjectId, srcRoomId);
      const dstRoomDir = path.join(this.uploadsDir, 'photos', userId, dstProjectId, dstRoomId);

      let files: string[];
      try {
        files = await fs.readdir(srcRoomDir);
      } catch {
        continue; // directory doesn't exist — room has no photos
      }

      await fs.mkdir(dstRoomDir, { recursive: true });

      for (const filename of files) {
        await fs.copyFile(
          path.join(srcRoomDir, filename),
          path.join(dstRoomDir, filename),
        );
        const srcRel = `uploads/photos/${userId}/${srcProjectId}/${srcRoomId}/${filename}`;
        const dstRel = `uploads/photos/${userId}/${dstProjectId}/${dstRoomId}/${filename}`;
        filePathMap[srcRel] = dstRel;
      }
    }

    return filePathMap;
  }
}
