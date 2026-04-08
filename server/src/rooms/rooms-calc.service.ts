import { Injectable } from '@nestjs/common';
import type { Wall } from '@prisma/client';

export interface RoomStats {
  perimeter: number;       // mm
  area: number | null;     // mm²  — null if shape is not rectangular or <2 walls
  volume: number | null;   // mm³  — null if ceilingHeight is missing
  curvatureMean: number | null;
  curvatureStdDev: number | null;
}

@Injectable()
export class RoomsCalcService {
  /**
   * Perimeter — sum of all wall lengths (mm).
   */
  perimeter(walls: Wall[]): number {
    return walls.reduce((sum, w) => sum + w.length, 0);
  }

  /**
   * Area for a rectangular room (mm²): AB * BC.
   * Returns null when fewer than 2 walls are provided.
   */
  area(walls: Wall[]): number | null {
    if (walls.length < 2) return null;
    const sorted = [...walls].sort((a, b) => a.sortOrder - b.sortOrder);
    const a = sorted[0]!.length;
    const b = sorted[1]!.length;
    return a * b;
  }

  /**
   * Volume (mm³): area * ceilingHeight (mm).
   */
  volume(walls: Wall[], ceilingHeightMm: number | null): number | null {
    const a = this.area(walls);
    if (a === null || ceilingHeightMm === null) return null;
    return a * ceilingHeightMm;
  }

  /**
   * Curvature statistics across all walls that have at least one curvature reading.
   * Readings: bottom / middle / top (any non-null value contributes).
   */
  curvatureStats(walls: Wall[]): { mean: number | null; stdDev: number | null } {
    const values: number[] = [];
    for (const w of walls) {
      if (w.curvatureBottom !== null) values.push(w.curvatureBottom);
      if (w.curvatureMiddle !== null) values.push(w.curvatureMiddle);
      if (w.curvatureTop !== null) values.push(w.curvatureTop);
    }

    if (values.length === 0) return { mean: null, stdDev: null };

    const mean = values.reduce((s, v) => s + v, 0) / values.length;

    const variance =
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  /**
   * Composite room stats.
   */
  compute(walls: Wall[], ceilingHeight1: number | null): RoomStats {
    const { mean, stdDev } = this.curvatureStats(walls);
    // Convert ceilingHeight from metres to mm for volume
    const heightMm = ceilingHeight1 !== null ? Math.round(ceilingHeight1 * 1000) : null;
    return {
      perimeter: this.perimeter(walls),
      area: this.area(walls),
      volume: this.volume(walls, heightMm),
      curvatureMean: mean,
      curvatureStdDev: stdDev,
    };
  }
}
