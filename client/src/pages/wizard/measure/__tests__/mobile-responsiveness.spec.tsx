/**
 * S5-04 Mobile adaptation — responsive tests
 *
 * Verifies that all wizard measure steps have:
 *   • sticky bottom nav (`sticky bottom-0` classes)
 *   • mobile bottom padding (`pb-20` class)
 *   • photo input with `capture="environment"`
 *   • Button md size meets 44 px touch-target minimum
 *
 * jsdom doesn't apply CSS, so these are structural/class assertion tests
 * rather than visual snapshots. They catch regressions in responsive markup.
 */

import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { CornerLabelStep } from '../CornerLabelStep';
import { CeilingHeightStep } from '../CeilingHeightStep';
import { WallDimensionsStep } from '../WallDimensionsStep';
import { PerimeterWalkStep } from '../PerimeterWalkStep';
import { OpeningsStep } from '../OpeningsStep';
import { WallElevationStep } from '../WallElevationStep';
import { PhotoChecklistStep } from '../PhotoChecklistStep';
import { useRoomMeasureStore } from '../../../../stores/roomMeasureStore';

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../../../../stores/roomMeasureStore', () => ({
  useRoomMeasureStore: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ projectId: 'proj-1', roomId: 'room-1' }),
  };
});

vi.mock('../../../../api/photos', () => ({
  photosApi: { list: vi.fn().mockResolvedValue([]), upload: vi.fn(), remove: vi.fn() },
}));

vi.mock('../../../../api/rooms', () => ({
  roomsApi: { update: vi.fn(), list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../../../api/walls', () => ({
  wallsApi: { create: vi.fn(), update: vi.fn() },
}));

vi.mock('../../../../api/segments', () => ({
  segmentsApi: { create: vi.fn(), update: vi.fn(), remove: vi.fn(), list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../../../api/openings', () => ({
  openingsApi: {
    windows: { list: vi.fn().mockResolvedValue([]), update: vi.fn() },
    doors: { list: vi.fn().mockResolvedValue([]), update: vi.fn() },
  },
}));

vi.mock('../../../../api/elements', () => ({
  elementsApi: { create: vi.fn(), remove: vi.fn() },
}));

const baseRoom = {
  id: 'room-1',
  projectId: 'proj-1',
  name: 'Гостиная',
  type: 'LIVING_ROOM' as const,
  shape: 'RECTANGLE' as const,
  ceilingHeight1: 2.5,
  ceilingHeight2: null,
  sortOrder: 0,
  isMeasured: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const baseWall = {
  id: 'wall-1',
  roomId: 'room-1',
  label: 'A–B',
  cornerFrom: 'A',
  cornerTo: 'B',
  length: 3.5,
  material: 'CONCRETE' as const,
  wallType: 'INTERNAL' as const,
  sortOrder: 0,
  curvatureBottom: null,
  curvatureMiddle: null,
  curvatureTop: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const storeBase = {
  currentRoom: baseRoom,
  walls: [baseWall],
  segments: {},
  windows: {},
  doors: {},
  elements: [],
  setSubstep: vi.fn(),
  setWalls: vi.fn(),
  upsertWall: vi.fn(),
  setWindows: vi.fn(),
  setDoors: vi.fn(),
  upsertWindow: vi.fn(),
  upsertDoor: vi.fn(),
  upsertElement: vi.fn(),
  removeElement: vi.fn(),
  setSegments: vi.fn(),
  upsertSegment: vi.fn(),
  removeSegment: vi.fn(),
  setActiveWallId: vi.fn(),
};

const setupStore = (overrides = {}) => {
  vi.mocked(useRoomMeasureStore).mockReturnValue({
    ...storeBase,
    ...overrides,
  } as ReturnType<typeof useRoomMeasureStore>);
};

// ── Viewports ─────────────────────────────────────────────────────────────

const VIEWPORTS = [320, 375, 768] as const;

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  window.dispatchEvent(new Event('resize'));
}

// ── Helpers ───────────────────────────────────────────────────────────────

function hasStickyNav(container: HTMLElement): boolean {
  const stickyEls = container.querySelectorAll('[class*="sticky"][class*="bottom-0"]');
  return stickyEls.length > 0;
}

function hasMobilePadding(container: HTMLElement): boolean {
  const el = container.querySelector('[class*="pb-20"]');
  return el !== null;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Mobile responsiveness — sticky nav and touch targets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  describe.each(VIEWPORTS)('viewport %ipx', (width) => {
    beforeEach(() => setViewport(width));

    it('CornerLabelStep has sticky bottom nav', () => {
      const { container } = render(<CornerLabelStep />);
      expect(hasStickyNav(container)).toBe(true);
    });

    it('CornerLabelStep has mobile bottom padding', () => {
      const { container } = render(<CornerLabelStep />);
      expect(hasMobilePadding(container)).toBe(true);
    });

    it('WallDimensionsStep has sticky bottom nav', () => {
      const { container } = render(<WallDimensionsStep />);
      expect(hasStickyNav(container)).toBe(true);
    });

    it('WallDimensionsStep has mobile bottom padding', () => {
      const { container } = render(<WallDimensionsStep />);
      expect(hasMobilePadding(container)).toBe(true);
    });

    it('OpeningsStep has sticky bottom nav', () => {
      const { container } = render(<OpeningsStep />);
      expect(hasStickyNav(container)).toBe(true);
    });

    it('WallElevationStep has sticky bottom nav', () => {
      const { container } = render(<WallElevationStep />);
      expect(hasStickyNav(container)).toBe(true);
    });

    it('PhotoChecklistStep has sticky bottom nav', () => {
      const { container } = render(
        <BrowserRouter>
          <PhotoChecklistStep />
        </BrowserRouter>,
      );
      expect(hasStickyNav(container)).toBe(true);
    });

    it('PhotoChecklistStep has mobile bottom padding', () => {
      const { container } = render(
        <BrowserRouter>
          <PhotoChecklistStep />
        </BrowserRouter>,
      );
      expect(hasMobilePadding(container)).toBe(true);
    });
  });
});

describe('Mobile responsiveness — photo capture attribute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it('PhotoChecklistStep file input has capture="environment"', () => {
    const { container } = render(
      <BrowserRouter>
        <PhotoChecklistStep />
      </BrowserRouter>,
    );
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    expect(fileInput?.getAttribute('capture')).toBe('environment');
  });
});

describe('Mobile responsiveness — touch targets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it('primary Button md has min-h-[44px] class', () => {
    const { container } = render(<CornerLabelStep />);
    const buttons = container.querySelectorAll('button');
    const mdButton = Array.from(buttons).find((b) =>
      b.className.includes('min-h-[44px]'),
    );
    expect(mdButton).toBeDefined();
  });
});

describe('CeilingHeightStep mobile nav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it.each(VIEWPORTS)('has sticky nav at %ipx', (width) => {
    setViewport(width);
    const { container } = render(<CeilingHeightStep />);
    expect(hasStickyNav(container)).toBe(true);
  });

  it.each(VIEWPORTS)('has mobile padding at %ipx', (width) => {
    setViewport(width);
    const { container } = render(<CeilingHeightStep />);
    expect(hasMobilePadding(container)).toBe(true);
  });
});

describe('PerimeterWalkStep mobile nav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it.each(VIEWPORTS)('has sticky nav at %ipx', (width) => {
    setViewport(width);
    const { container } = render(<PerimeterWalkStep />);
    expect(hasStickyNav(container)).toBe(true);
  });
});
