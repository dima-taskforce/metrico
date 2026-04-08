import { Test, TestingModule } from '@nestjs/testing';
import { WallMaterial, WallType } from '@prisma/client';
import { RoomsCalcService } from '../rooms-calc.service';
import type { Wall, Angle } from '@prisma/client';

const NOW = new Date();

const makeWall = (overrides: Partial<Wall> = {}): Wall => ({
  id: 'w1',
  roomId: 'r1',
  label: 'A-B',
  cornerFrom: 'A',
  cornerTo: 'B',
  length: 4000,
  sortOrder: 0,
  material: WallMaterial.CONCRETE,
  wallType: WallType.EXTERNAL,
  curvatureBottom: null,
  curvatureMiddle: null,
  curvatureTop: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeAngle = (overrides: Partial<Angle> = {}): Angle => ({
  id: 'a1',
  roomId: 'r1',
  wallAId: 'w1',
  wallBId: 'w2',
  isRightAngle: true,
  angleDegrees: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

// Seed data: Rectangle 4020 × 2890 mm (4 walls, all right angles)
const SEED_RECT_WALLS: Wall[] = [
  makeWall({ id: 'w1', length: 4020, sortOrder: 0 }),
  makeWall({ id: 'w2', length: 2890, sortOrder: 1 }),
  makeWall({ id: 'w3', length: 4020, sortOrder: 2 }),
  makeWall({ id: 'w4', length: 2890, sortOrder: 3 }),
];

const SEED_RECT_ANGLES: Angle[] = [
  makeAngle({ id: 'a1', wallAId: 'w1', wallBId: 'w2', isRightAngle: true }),
  makeAngle({ id: 'a2', wallAId: 'w2', wallBId: 'w3', isRightAngle: true }),
  makeAngle({ id: 'a3', wallAId: 'w3', wallBId: 'w4', isRightAngle: true }),
  makeAngle({ id: 'a4', wallAId: 'w4', wallBId: 'w1', isRightAngle: true }),
];

describe('RoomsCalcService', () => {
  let service: RoomsCalcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsCalcService],
    }).compile();
    service = module.get(RoomsCalcService);
  });

  // ── computePerimeter ──────────────────────────────────────────────────────

  describe('computePerimeter', () => {
    it('returns sum of all wall lengths', () => {
      // 4020 + 2890 + 4020 + 2890 = 13820 mm
      expect(service.computePerimeter(SEED_RECT_WALLS)).toBe(13820);
    });

    it('returns 0 for empty walls array', () => {
      expect(service.computePerimeter([])).toBe(0);
    });

    it('returns single wall length when only one wall', () => {
      expect(service.computePerimeter([makeWall({ length: 3500 })])).toBe(3500);
    });
  });

  // ── computeArea ───────────────────────────────────────────────────────────

  describe('computeArea', () => {
    it('returns AB × BC for a 2-wall rectangle', () => {
      const walls = [
        makeWall({ id: 'w1', length: 4000, sortOrder: 0 }),
        makeWall({ id: 'w2', length: 3000, sortOrder: 1 }),
      ];
      // 4000 * 3000 = 12,000,000 mm²
      expect(service.computeArea(walls, [])).toBe(12000000);
    });

    it('returns null when fewer than 2 walls', () => {
      expect(service.computeArea([makeWall()], [])).toBeNull();
      expect(service.computeArea([], [])).toBeNull();
    });

    it('computes area for 4-wall rectangle using Shoelace formula', () => {
      // Rectangle 4020 × 2890 mm
      const area = service.computeArea(SEED_RECT_WALLS, SEED_RECT_ANGLES);
      expect(area).toBe(4020 * 2890);
    });

    it('uses sortOrder to determine wall traversal order', () => {
      // Same rectangle, but walls provided in reverse order
      const shuffled = [...SEED_RECT_WALLS].reverse();
      const area = service.computeArea(shuffled, SEED_RECT_ANGLES);
      expect(area).toBe(4020 * 2890);
    });

    it('computes area for L-shaped room (6 walls, right angles)', () => {
      // L-shape: 1000×1000 square + 500×1000 extension
      // Total area = 1000*1000 + 500*1000 = 1,500,000 mm²
      const walls: Wall[] = [
        makeWall({ id: 'l1', length: 1000, sortOrder: 0 }),
        makeWall({ id: 'l2', length: 1000, sortOrder: 1 }),
        makeWall({ id: 'l3', length: 500, sortOrder: 2 }),
        makeWall({ id: 'l4', length: 1000, sortOrder: 3 }),
        makeWall({ id: 'l5', length: 500, sortOrder: 4 }),
        makeWall({ id: 'l6', length: 2000, sortOrder: 5 }),
      ];
      const angles: Angle[] = [
        makeAngle({ wallAId: 'l1', wallBId: 'l2', isRightAngle: true }),
        makeAngle({ wallAId: 'l2', wallBId: 'l3', isRightAngle: true }),
        makeAngle({ wallAId: 'l3', wallBId: 'l4', isRightAngle: true }),
        makeAngle({ wallAId: 'l4', wallBId: 'l5', isRightAngle: true }),
        makeAngle({ wallAId: 'l5', wallBId: 'l6', isRightAngle: true }),
        makeAngle({ wallAId: 'l6', wallBId: 'l1', isRightAngle: true }),
      ];
      const area = service.computeArea(walls, angles);
      expect(area).toBe(1500000);
    });

    it('defaults to right angle when no angle record found', () => {
      // Rectangle with missing angle record — should still compute correctly by defaulting
      const area = service.computeArea(SEED_RECT_WALLS, []); // Empty angles array
      expect(area).toBe(4020 * 2890);
    });
  });

  // ── computeVolume ─────────────────────────────────────────────────────────

  describe('computeVolume', () => {
    it('returns area × ceilingHeight when only h1 provided', () => {
      const area = 4020 * 2890;
      const h1Mm = 2680;
      expect(service.computeVolume(area, h1Mm, null)).toBe(area * h1Mm);
    });

    it('returns area × average(h1, h2) when both heights provided', () => {
      const area = 4020 * 2890;
      const h1Mm = 2600;
      const h2Mm = 2800;
      const avgH = (h1Mm + h2Mm) / 2;
      expect(service.computeVolume(area, h1Mm, h2Mm)).toBe(area * avgH);
    });

    it('returns null when area is null', () => {
      expect(service.computeVolume(null, 2680, null)).toBeNull();
    });

    it('returns null when h1 is null', () => {
      const area = 1000000;
      expect(service.computeVolume(area, null, null)).toBeNull();
    });
  });

  // ── computeCurvatureAvg ───────────────────────────────────────────────────

  describe('computeCurvatureAvg', () => {
    it('returns null when no curvature readings', () => {
      const wall = makeWall({
        curvatureBottom: null,
        curvatureMiddle: null,
        curvatureTop: null,
      });
      expect(service.computeCurvatureAvg(wall)).toBeNull();
    });

    it('averages available curvature readings', () => {
      const wall = makeWall({
        curvatureBottom: 0.01,
        curvatureMiddle: 0.02,
        curvatureTop: 0.03,
      });
      expect(service.computeCurvatureAvg(wall)).toBeCloseTo(0.02, 5);
    });

    it('averages partial curvature readings', () => {
      const wall = makeWall({
        curvatureBottom: 0.02,
        curvatureMiddle: null,
        curvatureTop: 0.04,
      });
      expect(service.computeCurvatureAvg(wall)).toBeCloseTo(0.03, 5);
    });
  });

  // ── computeCurvatureDeviation ─────────────────────────────────────────────

  describe('computeCurvatureDeviation', () => {
    it('returns null when no curvature readings', () => {
      const wall = makeWall({
        curvatureBottom: null,
        curvatureMiddle: null,
        curvatureTop: null,
      });
      expect(service.computeCurvatureDeviation(wall)).toBeNull();
    });

    it('returns max deviation from average', () => {
      const wall = makeWall({
        curvatureBottom: 0.0,
        curvatureMiddle: 0.02,
        curvatureTop: 0.04,
      });
      // avg = 0.02, deviations = [0.02, 0, 0.02], max = 0.02
      expect(service.computeCurvatureDeviation(wall)).toBeCloseTo(0.02, 5);
    });

    it('returns 0 when all curvatures are equal', () => {
      const wall = makeWall({
        curvatureBottom: 0.01,
        curvatureMiddle: 0.01,
        curvatureTop: 0.01,
      });
      expect(service.computeCurvatureDeviation(wall)).toBeCloseTo(0, 10);
    });
  });

  // ── curvatureStats ────────────────────────────────────────────────────────

  describe('curvatureStats', () => {
    it('returns null stats when no curvature data', () => {
      const result = service.curvatureStats(SEED_RECT_WALLS);
      expect(result.mean).toBeNull();
      expect(result.stdDev).toBeNull();
    });

    it('computes mean and stdDev from all curvature readings', () => {
      const walls: Wall[] = [
        makeWall({ id: 'w1', curvatureBottom: 0.0, curvatureTop: 0.04 }),
        makeWall({ id: 'w2', curvatureMiddle: 0.02 }),
      ];
      const result = service.curvatureStats(walls);
      // values = [0, 0.04, 0.02], mean = 0.02
      expect(result.mean).toBeCloseTo(0.02, 5);
      // variance = ((0-0.02)² + (0.04-0.02)² + (0.02-0.02)²) / 3 ≈ 0.000267
      // stdDev ≈ 0.01633
      expect(result.stdDev).toBeCloseTo(0.01633, 4);
    });

    it('returns stdDev=0 when all readings are identical', () => {
      const walls: Wall[] = [
        makeWall({ id: 'w1', curvatureBottom: 0.01, curvatureTop: 0.01 }),
        makeWall({ id: 'w2', curvatureMiddle: 0.01 }),
      ];
      const result = service.curvatureStats(walls);
      expect(result.stdDev).toBeCloseTo(0, 10);
    });
  });

  // ── compute ───────────────────────────────────────────────────────────────

  describe('compute', () => {
    it('computes all stats for a rectangle with single ceiling height', () => {
      const result = service.compute(SEED_RECT_WALLS, SEED_RECT_ANGLES, 2.68, null);

      expect(result.perimeter).toBe(13820);
      expect(result.area).toBe(4020 * 2890);
      expect(result.volume).toBe(4020 * 2890 * 2680); // 2.68m → 2680mm
      expect(result.curvatureMean).toBeNull();
      expect(result.curvatureStdDev).toBeNull();
    });

    it('computes volume as average height when both heights provided', () => {
      const result = service.compute(SEED_RECT_WALLS, SEED_RECT_ANGLES, 2.6, 2.8);

      expect(result.perimeter).toBe(13820);
      expect(result.area).toBe(4020 * 2890);
      // avg = (2600 + 2800) / 2 = 2700mm
      expect(result.volume).toBe(4020 * 2890 * 2700);
    });

    it('returns null volume when ceilingHeight1 is null', () => {
      const result = service.compute(SEED_RECT_WALLS, SEED_RECT_ANGLES, null, null);
      expect(result.volume).toBeNull();
    });

    it('includes curvature stats in compute result', () => {
      const wallsWithCurv: Wall[] = [
        makeWall({
          id: 'w1',
          length: 4020,
          sortOrder: 0,
          curvatureBottom: 0.01,
        }),
        makeWall({
          id: 'w2',
          length: 2890,
          sortOrder: 1,
          curvatureTop: 0.03,
        }),
        makeWall({
          id: 'w3',
          length: 4020,
          sortOrder: 2,
          curvatureMiddle: 0.02,
        }),
        makeWall({
          id: 'w4',
          length: 2890,
          sortOrder: 3,
          curvatureBottom: null,
        }),
      ];
      const result = service.compute(wallsWithCurv, SEED_RECT_ANGLES, 2.68, null);

      expect(result.curvatureMean).toBeCloseTo(0.02, 5);
      expect(result.curvatureStdDev).toBeCloseTo(0.00816, 4);
    });
  });
});
