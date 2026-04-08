import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<{
    status: 'ok' | 'degraded';
    timestamp: string;
    uptime: number;
    db: { status: 'ok' | 'error'; error?: string };
    disk: { free: number; total: number; freeGb: number } | null;
  }> {
    let dbStatus: 'ok' | 'error' = 'ok';
    let dbError: string | undefined;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      dbStatus = 'error';
      dbError = String(err);
    }

    let disk: { free: number; total: number; freeGb: number } | null = null;
    try {
      const dataDir = process.env['UPLOADS_DIR'] ?? '/app/data';
      const stats = fs.statfsSync(dataDir);
      const free = stats.bfree * stats.bsize;
      const total = stats.blocks * stats.bsize;
      disk = { free, total, freeGb: +(free / 1e9).toFixed(2) };
    } catch {
      // statfsSync not available or dir missing — not fatal
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      db: { status: dbStatus, ...(dbError ? { error: dbError } : {}) },
      disk,
    };
  }
}
