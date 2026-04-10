import { GeometryAssemblerService } from '../geometry-assembler.service';
import type { Angle } from '@prisma/client';

// Helper to build a minimal mock Room with rectangular walls (all right angles)
function makeRoom(
  id: string,
  walls: Array<{
    id: string;
    sortOrder: number;
    length: number; // meters
    segments?: Array<{
      id: string;
      sortOrder: number;
      length: number; // meters
      leadsToRoomId?: string | null;
    }>;
    cornerTo?: string;
  }>,
) {
  return {
    id,
    name: id,
    projectId: 'proj-1',
    type: 'LIVING' as const,
    shape: 'RECTANGLE' as const,
    ceilingHeight1: 2.7,
    ceilingHeight2: null,
    sortOrder: 0,
    isMeasured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    walls: walls.map((w) => ({
      id: w.id,
      roomId: id,
      label: w.id,
      cornerFrom: 'A',
      cornerTo: w.cornerTo ?? 'B',
      length: w.length,
      material: 'CONCRETE' as const,
      wallType: 'INTERNAL' as const,
      curvatureBottom: null,
      curvatureMiddle: null,
      curvatureTop: null,
      sortOrder: w.sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
      segments: (w.segments ?? []).map((s) => ({
        id: s.id,
        wallId: w.id,
        segmentType: 'PLAIN' as const,
        length: s.length,
        offsetFromPrev: null,
        depth: null,
        isInner: null,
        sortOrder: s.sortOrder,
        windowOpeningId: null,
        doorOpeningId: null,
        leadsToRoomId: s.leadsToRoomId ?? null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        windowOpening: null,
        doorOpening: null,
      })),
    })),
  };
}

// Right-angle Angle record
function rightAngle(roomId: string, cornerLabel: string): Angle {
  return {
    id: `${roomId}-${cornerLabel}`,
    roomId,
    cornerLabel,
    wallAId: 'wa',
    wallBId: 'wb',
    isRightAngle: true,
    angleDegrees: null,
    photoPath: null,
  } as Angle;
}

describe('GeometryAssemblerService', () => {
  let service: GeometryAssemblerService;

  beforeEach(() => {
    service = new GeometryAssemblerService();
  });

  describe('computeLayout', () => {
    it('returns empty placements when no leadsToRoomId segments exist', () => {
      const room = makeRoom('r1', [
        { id: 'w1', sortOrder: 0, length: 4 },
        { id: 'w2', sortOrder: 1, length: 3 },
        { id: 'w3', sortOrder: 2, length: 4 },
        { id: 'w4', sortOrder: 3, length: 3 },
      ]);
      const result = service.computeLayout([room], []);
      expect(result.placements).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('places first room at origin with zero rotation', () => {
      const room1 = makeRoom('r1', [
        { id: 'w1', sortOrder: 0, length: 5, cornerTo: 'B', segments: [
          { id: 's1', sortOrder: 0, length: 1, leadsToRoomId: 'r2' },
          { id: 's2', sortOrder: 1, length: 4 },
        ]},
        { id: 'w2', sortOrder: 1, length: 4, cornerTo: 'C' },
        { id: 'w3', sortOrder: 2, length: 5, cornerTo: 'D' },
        { id: 'w4', sortOrder: 3, length: 4, cornerTo: 'A' },
      ]);
      const room2 = makeRoom('r2', [
        { id: 'w5', sortOrder: 0, length: 3, cornerTo: 'B', segments: [
          { id: 's3', sortOrder: 0, length: 1, leadsToRoomId: 'r1' },
          { id: 's4', sortOrder: 1, length: 2 },
        ]},
        { id: 'w6', sortOrder: 1, length: 4, cornerTo: 'C' },
        { id: 'w7', sortOrder: 2, length: 3, cornerTo: 'D' },
        { id: 'w8', sortOrder: 3, length: 4, cornerTo: 'A' },
      ]);

      const angles: Angle[] = [];
      const result = service.computeLayout([room1, room2], angles);

      expect(result.placements.length).toBeGreaterThanOrEqual(1);
      const first = result.placements.find((p) => p.roomId === 'r1');
      expect(first).toBeDefined();
      expect(first!.x).toBeCloseTo(0, 5);
      expect(first!.y).toBeCloseTo(0, 5);
      expect(first!.rotation).toBeCloseTo(0, 3);
    });

    it('places both rooms when connected via leadsToRoomId', () => {
      const room1 = makeRoom('r1', [
        { id: 'w1', sortOrder: 0, length: 5, cornerTo: 'B', segments: [
          { id: 's1', sortOrder: 0, length: 1, leadsToRoomId: 'r2' },
          { id: 's2', sortOrder: 1, length: 4 },
        ]},
        { id: 'w2', sortOrder: 1, length: 4, cornerTo: 'C' },
        { id: 'w3', sortOrder: 2, length: 5, cornerTo: 'D' },
        { id: 'w4', sortOrder: 3, length: 4, cornerTo: 'A' },
      ]);
      const room2 = makeRoom('r2', [
        { id: 'w5', sortOrder: 0, length: 3, cornerTo: 'B', segments: [
          { id: 's3', sortOrder: 0, length: 1, leadsToRoomId: 'r1' },
          { id: 's4', sortOrder: 1, length: 2 },
        ]},
        { id: 'w6', sortOrder: 1, length: 4, cornerTo: 'C' },
        { id: 'w7', sortOrder: 2, length: 3, cornerTo: 'D' },
        { id: 'w8', sortOrder: 3, length: 4, cornerTo: 'A' },
      ]);

      const result = service.computeLayout([room1, room2], []);

      expect(result.placements).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      const p1 = result.placements.find((p) => p.roomId === 'r1')!;
      const p2 = result.placements.find((p) => p.roomId === 'r2')!;
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();

      // Each placement should include a polygon with correct vertex count
      expect(p1.polygon).toHaveLength(4);
      expect(p2.polygon).toHaveLength(4);
    });

    it('returns error for room not yet placed (isolated neighbor)', () => {
      // Room r3 has a leadsToRoomId pointing to non-existent room
      const room = makeRoom('r1', [
        { id: 'w1', sortOrder: 0, length: 4, cornerTo: 'B', segments: [
          { id: 's1', sortOrder: 0, length: 1, leadsToRoomId: 'non-existent' },
          { id: 's2', sortOrder: 1, length: 3 },
        ]},
        { id: 'w2', sortOrder: 1, length: 3, cornerTo: 'C' },
        { id: 'w3', sortOrder: 2, length: 4, cornerTo: 'D' },
        { id: 'w4', sortOrder: 3, length: 3, cornerTo: 'A' },
      ]);

      // Should not throw, should just skip the unknown room
      expect(() => service.computeLayout([room], [])).not.toThrow();
      const result = service.computeLayout([room], []);
      expect(result.placements).toHaveLength(1); // only r1 is placed
    });
  });

  describe('buildRoomPolygon (via computeLayout)', () => {
    it('produces a closed rectangle: last vertex near first', () => {
      // 4m × 3m rectangle — all right angles
      const room = makeRoom('r1', [
        { id: 'w1', sortOrder: 0, length: 4, cornerTo: 'B', segments: [
          { id: 's1', sortOrder: 0, length: 1, leadsToRoomId: 'r2' },
          { id: 's2', sortOrder: 1, length: 3 },
        ]},
        { id: 'w2', sortOrder: 1, length: 3, cornerTo: 'C' },
        { id: 'w3', sortOrder: 2, length: 4, cornerTo: 'D' },
        { id: 'w4', sortOrder: 3, length: 3, cornerTo: 'A' },
      ]);
      // Fake neighbor just to trigger hasPassages
      const room2 = makeRoom('r2', [
        { id: 'w5', sortOrder: 0, length: 4, cornerTo: 'B', segments: [
          { id: 's3', sortOrder: 0, length: 1, leadsToRoomId: 'r1' },
          { id: 's4', sortOrder: 1, length: 3 },
        ]},
        { id: 'w6', sortOrder: 1, length: 3, cornerTo: 'C' },
        { id: 'w7', sortOrder: 2, length: 4, cornerTo: 'D' },
        { id: 'w8', sortOrder: 3, length: 3, cornerTo: 'A' },
      ]);

      const angles = [
        rightAngle('r1', 'B'),
        rightAngle('r1', 'C'),
        rightAngle('r1', 'D'),
        rightAngle('r1', 'A'),
        rightAngle('r2', 'B'),
        rightAngle('r2', 'C'),
        rightAngle('r2', 'D'),
        rightAngle('r2', 'A'),
      ];

      const result = service.computeLayout([room, room2], angles);
      const p1 = result.placements.find((p) => p.roomId === 'r1')!;

      expect(p1.polygon).toHaveLength(4);

      // For a rectangle starting East, right turns of π/2:
      // (0,0) → (4000,0) → (4000,3000) → (0,3000)
      // (all in mm at scale: wall.length * 1000)
      expect(p1.polygon[0]!.x).toBeCloseTo(0, 0);
      expect(p1.polygon[0]!.y).toBeCloseTo(0, 0);
      expect(p1.polygon[1]!.x).toBeCloseTo(4000, 0);
      expect(p1.polygon[1]!.y).toBeCloseTo(0, 0);
      expect(p1.polygon[2]!.x).toBeCloseTo(4000, 0);
      expect(p1.polygon[2]!.y).toBeCloseTo(3000, 0);
      expect(p1.polygon[3]!.x).toBeCloseTo(0, 0);
      expect(p1.polygon[3]!.y).toBeCloseTo(3000, 0);
    });
  });
});
