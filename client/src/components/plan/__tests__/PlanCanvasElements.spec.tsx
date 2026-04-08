import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanCanvas, computeRoomDimensions, computeSegmentOffsets, MM_TO_PX } from '../PlanCanvas';
import type { FloorPlanRoom, FloorPlanWall, FloorPlanSegment } from '../../../types/api';

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Group: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span data-testid="konva-text">{text}</span>,
  Circle: () => null,
  Line: () => null,
  Arc: () => null,
  Shape: () => null,
}));

// ── Helper factories ──────────────────────────────────────────────────────────

const makeWall = (id: string, length: number, segments: FloorPlanSegment[] = []): FloorPlanWall => ({
  id,
  roomId: 'r1',
  label: `Wall ${id}`,
  length,
  material: 'CONCRETE',
  wallType: 'EXTERNAL',
  sortOrder: 0,
  segments,
  openings: [],
});

const makeRoom = (overrides: Partial<FloorPlanRoom> = {}): FloorPlanRoom => ({
  id: 'r1',
  label: 'Гостиная',
  perimeter: 14000,
  area: 20.5,
  volume: 55.35,
  ceilingHeight: 2.7,
  curvatureMean: null,
  curvatureStdDev: null,
  walls: [
    makeWall('w1', 4500),
    makeWall('w2', 3000),
    makeWall('w3', 4500),
    makeWall('w4', 3000),
  ],
  elements: [],
  ...overrides,
});

const defaultPositions = { r1: { x: 20, y: 20, rotation: 0 } };

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// ── computeRoomDimensions ─────────────────────────────────────────────────────

describe('computeRoomDimensions', () => {
  it('returns min dimensions when walls is empty', () => {
    const result = computeRoomDimensions([]);
    expect(result.w).toBeGreaterThanOrEqual(80);
    expect(result.h).toBeGreaterThanOrEqual(60);
  });

  it('scales wall[0].length to width and wall[1].length to height', () => {
    const walls = [makeWall('w1', 4500), makeWall('w2', 3000)];
    const { w, h } = computeRoomDimensions(walls);
    expect(w).toBe(Math.round(4500 * MM_TO_PX));
    expect(h).toBe(Math.round(3000 * MM_TO_PX));
  });

  it('enforces minimum width and height', () => {
    const walls = [makeWall('w1', 100), makeWall('w2', 100)]; // tiny walls
    const { w, h } = computeRoomDimensions(walls);
    expect(w).toBeGreaterThanOrEqual(80);
    expect(h).toBeGreaterThanOrEqual(60);
  });
});

// ── computeSegmentOffsets ─────────────────────────────────────────────────────

describe('computeSegmentOffsets', () => {
  it('returns [0] for empty segments', () => {
    expect(computeSegmentOffsets([])).toEqual([0]);
  });

  it('accumulates segment lengths correctly', () => {
    const segments: FloorPlanSegment[] = [
      { id: 's1', label: 'S1', segmentType: 'PLAIN', length: 1000 },
      { id: 's2', label: 'S2', segmentType: 'WINDOW', length: 1500 },
      { id: 's3', label: 'S3', segmentType: 'PLAIN', length: 500 },
    ];
    const offsets = computeSegmentOffsets(segments);
    expect(offsets).toHaveLength(4);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBeCloseTo(1000 * MM_TO_PX);
    expect(offsets[2]).toBeCloseTo(2500 * MM_TO_PX);
    expect(offsets[3]).toBeCloseTo(3000 * MM_TO_PX);
  });
});

// ── PlanCanvas renders elements ────────────────────────────────────────────────

describe('PlanCanvas with elements', () => {
  it('renders without error when room has COLUMN element', () => {
    const room = makeRoom({
      elements: [{ id: 'el1', elementType: 'COLUMN', label: 'Колонна', depth: 0, x: 1000, y: 500 }],
    });
    expect(() =>
      render(
        <PlanCanvas
          rooms={[room]}
          selectedRoomId={null}
          onSelectRoom={vi.fn()}
          roomPositions={defaultPositions}
          onUpdateRoomPosition={vi.fn()}
          scale={1}
          onScaleChange={vi.fn()}
        />
      )
    ).not.toThrow();
  });

  it('renders without error when room has VENT_SHAFT element', () => {
    const room = makeRoom({
      elements: [{ id: 'el1', elementType: 'VENT_SHAFT', label: 'Вент-шахта', depth: 0, x: 500, y: 500 }],
    });
    expect(() =>
      render(
        <PlanCanvas
          rooms={[room]}
          selectedRoomId={null}
          onSelectRoom={vi.fn()}
          roomPositions={defaultPositions}
          onUpdateRoomPosition={vi.fn()}
          scale={1}
          onScaleChange={vi.fn()}
        />
      )
    ).not.toThrow();
  });

  it('renders without error when room has RADIATOR element', () => {
    const room = makeRoom({
      elements: [{ id: 'el1', elementType: 'RADIATOR', label: 'Радиатор', depth: 0, x: 2000, y: 0 }],
    });
    expect(() =>
      render(
        <PlanCanvas
          rooms={[room]}
          selectedRoomId={null}
          onSelectRoom={vi.fn()}
          roomPositions={defaultPositions}
          onUpdateRoomPosition={vi.fn()}
          scale={1}
          onScaleChange={vi.fn()}
        />
      )
    ).not.toThrow();
  });

  it('renders without error when room has ELECTRICAL_PANEL element', () => {
    const room = makeRoom({
      elements: [{ id: 'el1', elementType: 'ELECTRICAL_PANEL', label: 'Щит', depth: 0, x: 100, y: 100 }],
    });
    expect(() =>
      render(
        <PlanCanvas
          rooms={[room]}
          selectedRoomId={null}
          onSelectRoom={vi.fn()}
          roomPositions={defaultPositions}
          onUpdateRoomPosition={vi.fn()}
          scale={1}
          onScaleChange={vi.fn()}
        />
      )
    ).not.toThrow();
  });

  it('renders without error when room has PIPE element', () => {
    const room = makeRoom({
      elements: [{ id: 'el1', elementType: 'PIPE', label: 'Труба', depth: 0, x: 300, y: 300 }],
    });
    expect(() =>
      render(
        <PlanCanvas
          rooms={[room]}
          selectedRoomId={null}
          onSelectRoom={vi.fn()}
          roomPositions={defaultPositions}
          onUpdateRoomPosition={vi.fn()}
          scale={1}
          onScaleChange={vi.fn()}
        />
      )
    ).not.toThrow();
  });

  it('renders without error when room has multiple elements', () => {
    const room = makeRoom({
      elements: [
        { id: 'el1', elementType: 'COLUMN', label: 'Колонна', depth: 0, x: 0, y: 0 },
        { id: 'el2', elementType: 'RADIATOR', label: 'Радиатор', depth: 0, x: 2000, y: 0 },
        { id: 'el3', elementType: 'ELECTRICAL_PANEL', label: 'Щит', depth: 0, x: 100, y: 100 },
      ],
    });
    expect(() =>
      render(
        <PlanCanvas
          rooms={[room]}
          selectedRoomId={null}
          onSelectRoom={vi.fn()}
          roomPositions={defaultPositions}
          onUpdateRoomPosition={vi.fn()}
          scale={1}
          onScaleChange={vi.fn()}
        />
      )
    ).not.toThrow();
  });
});

// ── PlanCanvas renders wall segments ─────────────────────────────────────────

describe('PlanCanvas with wall segments', () => {
  it('renders without error when wall has WINDOW segment', () => {
    const room = makeRoom({
      walls: [
        makeWall('w1', 4500, [
          { id: 's1', label: 'S1', segmentType: 'PLAIN', length: 1500 },
          { id: 's2', label: 'S2', segmentType: 'WINDOW', length: 1500 },
          { id: 's3', label: 'S3', segmentType: 'PLAIN', length: 1500 },
        ]),
        makeWall('w2', 3000),
        makeWall('w3', 4500),
        makeWall('w4', 3000),
      ],
    });
    expect(() =>
      render(
        <PlanCanvas
          rooms={[room]}
          selectedRoomId={null}
          onSelectRoom={vi.fn()}
          roomPositions={defaultPositions}
          onUpdateRoomPosition={vi.fn()}
          scale={1}
          onScaleChange={vi.fn()}
        />
      )
    ).not.toThrow();
  });

  it('renders without error when wall has DOOR segment', () => {
    const room = makeRoom({
      walls: [
        makeWall('w1', 4500, [
          { id: 's1', label: 'S1', segmentType: 'PLAIN', length: 2700 },
          { id: 's2', label: 'S2', segmentType: 'DOOR', length: 900 },
          { id: 's3', label: 'S3', segmentType: 'PLAIN', length: 900 },
        ]),
        makeWall('w2', 3000),
        makeWall('w3', 4500),
        makeWall('w4', 3000),
      ],
    });
    expect(() =>
      render(
        <PlanCanvas
          rooms={[room]}
          selectedRoomId={null}
          onSelectRoom={vi.fn()}
          roomPositions={defaultPositions}
          onUpdateRoomPosition={vi.fn()}
          scale={1}
          onScaleChange={vi.fn()}
        />
      )
    ).not.toThrow();
  });

  it('renders without error when wall has PROTRUSION segment', () => {
    const room = makeRoom({
      walls: [
        makeWall('w1', 4500, [
          { id: 's1', label: 'S1', segmentType: 'PROTRUSION', length: 500 },
          { id: 's2', label: 'S2', segmentType: 'PLAIN', length: 4000 },
        ]),
        makeWall('w2', 3000),
        makeWall('w3', 4500),
        makeWall('w4', 3000),
      ],
    });
    expect(() =>
      render(
        <PlanCanvas
          rooms={[room]}
          selectedRoomId={null}
          onSelectRoom={vi.fn()}
          roomPositions={defaultPositions}
          onUpdateRoomPosition={vi.fn()}
          scale={1}
          onScaleChange={vi.fn()}
        />
      )
    ).not.toThrow();
  });
});

// ── PlanCanvas dimension labels ───────────────────────────────────────────────

describe('PlanCanvas dimension labels', () => {
  it('renders wall dimension labels in meters', () => {
    const room = makeRoom();
    render(
      <PlanCanvas
        rooms={[room]}
        selectedRoomId={null}
        onSelectRoom={vi.fn()}
        roomPositions={defaultPositions}
        onUpdateRoomPosition={vi.fn()}
        scale={1}
        onScaleChange={vi.fn()}
      />
    );
    // Dimension labels show wall lengths in meters (4500mm = 4.50 м)
    const dimLabels = screen.getAllByTestId('konva-text');
    const texts = dimLabels.map((el) => el.textContent ?? '');
    expect(texts.some((t) => t.includes('4.50 м'))).toBe(true);
    expect(texts.some((t) => t.includes('3.00 м'))).toBe(true);
  });

  it('renders room label', () => {
    const room = makeRoom();
    render(
      <PlanCanvas
        rooms={[room]}
        selectedRoomId={null}
        onSelectRoom={vi.fn()}
        roomPositions={defaultPositions}
        onUpdateRoomPosition={vi.fn()}
        scale={1}
        onScaleChange={vi.fn()}
      />
    );
    const texts = screen.getAllByTestId('konva-text').map((el) => el.textContent ?? '');
    expect(texts.some((t) => t === 'Гостиная')).toBe(true);
  });

  it('renders area label when area is not null', () => {
    const room = makeRoom({ area: 20.5 });
    render(
      <PlanCanvas
        rooms={[room]}
        selectedRoomId={null}
        onSelectRoom={vi.fn()}
        roomPositions={defaultPositions}
        onUpdateRoomPosition={vi.fn()}
        scale={1}
        onScaleChange={vi.fn()}
      />
    );
    const texts = screen.getAllByTestId('konva-text').map((el) => el.textContent ?? '');
    expect(texts.some((t) => t.includes('20.5 м²'))).toBe(true);
  });
});
