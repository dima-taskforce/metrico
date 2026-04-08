import { Test, TestingModule } from '@nestjs/testing';
import { WallMaterial, WallType } from '@prisma/client';
import { RoomsCalcService } from '../rooms-calc.service';
import type { Wall } from '@prisma/client';

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

// Seed data: Гостиная — rectangle 4020 × 2890 mm
const SEED_LIVING_WALLS: Wall[] = [
  makeWall({ id: 'w1', cornerFrom: 'A', cornerTo: 'B', length: 4020, sortOrder: 0 }),
  makeWall({ id: 'w2', cornerFrom: 'B', cornerTo: 'C', length: 2890, sortOrder: 1 }),
  makeWall({ id: 'w3', cornerFrom: 'C', cornerTo: 'D', length: 4020, sortOrder: 2 }),
  makeWall({ id: 'w4', cornerFrom: 'D', cornerTo: 'A', length: 2890, sortOrder: 3 }),
];

describe('RoomsCalcService', () => {
  let service: RoomsCalcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsCalcService],
    }).compile();
    service = module.get(RoomsCalcService);
  });

  // ── perimeter ─────────────────────────────────────────────────────────────

  describe('perimeter', () => {
    it('returns sum of all wall lengths', () => {
      // 4020 + 2890 + 4020 + 2890 = 13820 mm
      expect(service.perimeter(SEED_LIVING_WALLS)).toBe(13820);
    });

    it('returns 0 for empty walls array', () => {
      expect(service.perimeter([])).toBe(0);
    });

    it('returns single wall length when only one wall', () => {
      expect(service.perimeter([makeWall({ length: 3500 })])).toBe(3500);
    });
  });

  // ── area ─────────────────────────────────────────────────────────────────

  describe('area', () => {
    it('returns AB × BC for a rectangle', () => {
      // 4020 * 2890 = 11,617,800 mm²
      expect(service.area(SEED_LIVING_WALLS)).toBe(4020 * 2890);
    });

    it('returns null when fewer than 2 walls', () => {
      expect(service.area([makeWall()])).toBeNull();
      expect(service.area([])).toBeNull();
    });

    it('uses sortOrder to determine wall order', () => {
      // Shuffled input — area should still use walls sorted by sortOrder
      const shuffled = [...SEED_LIVING_WALLS].reverse();
      expect(service.area(shuffled)).toBe(4020 * 2890);
    });
  });

  // ── volume ────────────────────────────────────────────────────────────────

  describe('volume', () => {
    it('returns area × ceilingHeight', () => {
      // area = 4020 * 2890, ceilingHeight = 2680mm
      const expectedArea = 4020 * 2890;
      const ceilingMm = 2680;
      expect(service.volume(SEED_LIVING_WALLS, ceilingMm)).toBe(expectedArea * ceilingMm);
    });

    it('returns null when ceilingHeight is null', () => {
      expect(service.volume(SEED_LIVING_WALLS, null)).toBeNull();
    });

    it('returns null when fewer than 2 walls', () => {
      expect(service.volume([], 2680)).toBeNull();
    });
  });

  // ── curvatureStats ────────────────────────────────────────────────────────

  describe('curvatureStats', () => {
    it('returns null stats when no curvature data', () => {
      const result = service.curvatureStats(SEED_LIVING_WALLS);
      expect(result.mean).toBeNull();
      expect(result.stdDev).toBeNull();
    });

    it('computes mean from curvature readings', () => {
      const walls: Wall[] = [
        makeWall({ curvatureBottom: 0.01, curvatureTop: 0.03 }),
        makeWall({ id: 'w2', curvatureMiddle: 0.02 }),
      ];
      const result = service.curvatureStats(walls);
      // values = [0.01, 0.03, 0.02] → mean = 0.02
      expect(result.mean).toBeCloseTo(0.02, 5);
    });

    it('computes stdDev for mixed curvature values', () => {
      const walls: Wall[] = [
        makeWall({ curvatureBottom: 0.0, curvatureTop: 0.04 }),
      ];
      const result = service.curvatureStats(walls);
      // values = [0, 0.04] → mean = 0.02 → variance = ((0-0.02)² + (0.04-0.02)²)/2 = 0.0004/2... wait
      // variance = (0.0004 + 0.0004) / 2 = 0.0004, stdDev = 0.02
      expect(result.stdDev).toBeCloseTo(0.02, 5);
    });

    it('returns stdDev=0 when all curvature values are equal', () => {
      const walls: Wall[] = [
        makeWall({ curvatureBottom: 0.01, curvatureMiddle: 0.01, curvatureTop: 0.01 }),
      ];
      const result = service.curvatureStats(walls);
      expect(result.stdDev).toBeCloseTo(0, 10);
    });
  });

  // ── compute ───────────────────────────────────────────────────────────────

  describe('compute', () => {
    it('computes all stats for a seed room with ceilingHeight', () => {
      const result = service.compute(SEED_LIVING_WALLS, 2.68);

      expect(result.perimeter).toBe(13820);
      expect(result.area).toBe(4020 * 2890);
      // volume = area * 2680mm
      expect(result.volume).toBe(4020 * 2890 * 2680);
      expect(result.curvatureMean).toBeNull();
      expect(result.curvatureStdDev).toBeNull();
    });

    it('returns null volume when ceilingHeight is null', () => {
      const result = service.compute(SEED_LIVING_WALLS, null);
      expect(result.volume).toBeNull();
    });

    it('converts ceilingHeight from metres to mm for volume', () => {
      const result = service.compute(SEED_LIVING_WALLS, 2.68);
      const resultExplicit = service.compute(SEED_LIVING_WALLS, 2.68);
      // 2.68m → 2680mm
      expect(result.volume).toBe(resultExplicit.volume);
      expect(result.volume).toBe(4020 * 2890 * 2680);
    });
  });
});
