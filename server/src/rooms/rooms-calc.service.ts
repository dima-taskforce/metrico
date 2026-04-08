import { Injectable } from '@nestjs/common';
import type { Wall, Angle } from '@prisma/client';

export interface RoomStats {
  perimeter: number; // mm
  area: number | null; // mm²  — null if shape not rectangular or <2 walls
  volume: number | null; // mm³  — null if ceilingHeight is missing
  curvatureMean: number | null;
  curvatureStdDev: number | null;
}

interface Point {
  x: number;
  y: number;
}

@Injectable()
export class RoomsCalcService {
  /**
   * Compute perimeter — sum of all wall lengths (mm).
   */
  computePerimeter(walls: Wall[]): number {
    return walls.reduce((sum, w) => sum + w.length, 0);
  }

  /**
   * Compute area using Shoelace formula for arbitrary polygons.
   *
   * Algorithm:
   * 1. Walls must be sorted by sortOrder (clockwise traversal)
   * 2. For RECTANGLE: return length × width
   * 3. For complex shapes: reconstruct vertices from wall lengths and angles
   *    - Start at (0, 0), direction = 0° (rightward)
   *    - For each wall: add endpoint, then rotate by angle
   *    - If isRightAngle: rotate by -90° (clockwise)
   *    - Otherwise: rotate by angleDegrees
   * 4. Apply Shoelace formula: |Σ(x_i * y_{i+1} - x_{i+1} * y_i)| / 2
   */
  computeArea(walls: Wall[], angles: Angle[]): number | null {
    if (walls.length < 2) return null;

    const sorted = [...walls].sort((a, b) => a.sortOrder - b.sortOrder);

    // Special case for rectangles: 2+ walls of same pair
    if (sorted.length === 2) {
      const a = sorted[0]!.length;
      const b = sorted[1]!.length;
      return a * b;
    }

    // Complex shape: reconstruct vertices
    const vertices: Point[] = [];
    let x = 0;
    let y = 0;
    let direction = 0; // degrees, 0 = rightward

    vertices.push({ x, y });

    for (let i = 0; i < sorted.length; i++) {
      const wall = sorted[i]!;
      const length = wall.length;

      // Move in current direction
      const radians = (direction * Math.PI) / 180;
      x += length * Math.cos(radians);
      y += length * Math.sin(radians);

      vertices.push({ x, y });

      // Find angle at corner (between wall[i] and wall[i+1])
      if (i < sorted.length - 1) {
        const nextWall = sorted[i + 1]!;
        const angle = angles.find(
          (a) =>
            (a.wallAId === wall.id && a.wallBId === nextWall.id) ||
            (a.wallBId === wall.id && a.wallAId === nextWall.id),
        );

        if (angle) {
          if (angle.isRightAngle) {
            direction -= 90; // clockwise turn
          } else if (angle.angleDegrees !== null) {
            direction -= angle.angleDegrees; // use explicit angle
          }
        } else {
          // Default to right angle if no angle record
          direction -= 90;
        }

        // Normalize direction to [0, 360)
        direction = ((direction % 360) + 360) % 360;
      }
    }

    // Remove last duplicate point if it closes the polygon
    if (vertices.length > 1) {
      const first = vertices[0]!;
      const last = vertices[vertices.length - 1]!;
      if (Math.abs(first.x - last.x) < 0.001 && Math.abs(first.y - last.y) < 0.001) {
        vertices.pop();
      }
    }

    // Apply Shoelace formula
    let sum = 0;
    for (let i = 0; i < vertices.length; i++) {
      const current = vertices[i]!;
      const next = vertices[(i + 1) % vertices.length]!;
      sum += current.x * next.y - next.x * current.y;
    }

    const area = Math.abs(sum) / 2;
    return area;
  }

  /**
   * Compute volume (mm³).
   * - If both ceilingHeights provided: area × (h1 + h2) / 2
   * - If only h1: area × h1
   * Heights must be in millimetres.
   */
  computeVolume(
    area: number | null,
    ceilingHeight1Mm: number | null,
    ceilingHeight2Mm?: number | null,
  ): number | null {
    if (area === null) return null;
    if (ceilingHeight1Mm === null) return null;

    if (ceilingHeight2Mm !== null && ceilingHeight2Mm !== undefined) {
      const avgHeight = (ceilingHeight1Mm + ceilingHeight2Mm) / 2;
      return area * avgHeight;
    }

    return area * ceilingHeight1Mm;
  }

  /**
   * Compute average curvature across bottom/middle/top readings.
   */
  computeCurvatureAvg(wall: Wall): number | null {
    const values: number[] = [];
    if (wall.curvatureBottom !== null) values.push(wall.curvatureBottom);
    if (wall.curvatureMiddle !== null) values.push(wall.curvatureMiddle);
    if (wall.curvatureTop !== null) values.push(wall.curvatureTop);

    if (values.length === 0) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }

  /**
   * Compute max deviation from average curvature.
   */
  computeCurvatureDeviation(wall: Wall): number | null {
    const avg = this.computeCurvatureAvg(wall);
    if (avg === null) return null;

    const values: number[] = [];
    if (wall.curvatureBottom !== null) values.push(wall.curvatureBottom);
    if (wall.curvatureMiddle !== null) values.push(wall.curvatureMiddle);
    if (wall.curvatureTop !== null) values.push(wall.curvatureTop);

    if (values.length === 0) return null;

    let maxDeviation = 0;
    for (const v of values) {
      const deviation = Math.abs(v - avg);
      if (deviation > maxDeviation) maxDeviation = deviation;
    }

    return maxDeviation;
  }

  /**
   * Curvature statistics (old API for compatibility).
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
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  /**
   * Compute comprehensive room stats.
   * Heights in metres → converted to mm for internal calculations.
   */
  compute(
    walls: Wall[],
    angles: Angle[],
    ceilingHeight1: number | null,
    ceilingHeight2?: number | null,
  ): RoomStats {
    const { mean, stdDev } = this.curvatureStats(walls);
    const perimeter = this.computePerimeter(walls);

    // Convert heights from metres to mm
    const h1Mm = ceilingHeight1 !== null ? Math.round(ceilingHeight1 * 1000) : null;
    const h2Mm =
      ceilingHeight2 !== null && ceilingHeight2 !== undefined
        ? Math.round(ceilingHeight2 * 1000)
        : null;

    const area = this.computeArea(walls, angles);
    const volume = this.computeVolume(area, h1Mm, h2Mm);

    return {
      perimeter,
      area,
      volume,
      curvatureMean: mean,
      curvatureStdDev: stdDev,
    };
  }
}
