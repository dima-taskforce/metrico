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
}
