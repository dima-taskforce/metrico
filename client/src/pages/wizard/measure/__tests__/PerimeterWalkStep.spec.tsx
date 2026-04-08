import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PerimeterWalkStep } from '../PerimeterWalkStep';
import { useRoomMeasureStore } from '../../../../stores/roomMeasureStore';

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../../../../stores/roomMeasureStore', () => ({
  useRoomMeasureStore: vi.fn(),
}));

vi.mock('../../../../api/segments', () => ({
  segmentsApi: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    validate: vi.fn(),
  },
}));

vi.mock('../../../../api/openings', () => ({
  openingsApi: {
    windows: { create: vi.fn() },
    doors: { create: vi.fn() },
  },
}));

import { segmentsApi } from '../../../../api/segments';
import { openingsApi } from '../../../../api/openings';

const mockSetSubstep = vi.fn();
const mockSetSegments = vi.fn();
const mockUpsertSegment = vi.fn();
const mockRemoveSegment = vi.fn();
const mockUpsertWindow = vi.fn();
const mockUpsertDoor = vi.fn();
const mockSetActiveWallId = vi.fn();

const makeWall = (overrides = {}) => ({
  id: 'w1',
  roomId: 'r1',
  label: 'A-B',
  cornerFrom: 'A',
  cornerTo: 'B',
  length: 4.02,
  sortOrder: 0,
  material: 'CONCRETE' as const,
  wallType: 'INTERNAL' as const,
  curvatureBottom: null,
  curvatureMiddle: null,
  curvatureTop: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeSegment = (overrides = {}) => ({
  id: 's1',
  wallId: 'w1',
  segmentType: 'PLAIN' as const,
  length: 2.0,
  sortOrder: 0,
  description: null,
  depth: null,
  windowOpeningId: null,
  doorOpeningId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const setupStore = (walls = [makeWall()], segments: Record<string, ReturnType<typeof makeSegment>[]> = {}) => {
  vi.mocked(useRoomMeasureStore).mockReturnValue({
    walls,
    segments,
    setSegments: mockSetSegments,
    upsertSegment: mockUpsertSegment,
    removeSegment: mockRemoveSegment,
    upsertWindow: mockUpsertWindow,
    upsertDoor: mockUpsertDoor,
    setSubstep: mockSetSubstep,
    setActiveWallId: mockSetActiveWallId,
  } as ReturnType<typeof useRoomMeasureStore>);
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('PerimeterWalkStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(segmentsApi.list).mockResolvedValue([]);
  });

  it('shows empty-walls fallback when no walls', () => {
    setupStore([]);
    render(<PerimeterWalkStep />);
    expect(screen.getByText(/Нет стен/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /назад/i })).toBeInTheDocument();
  });

  it('renders wall tab for each wall', () => {
    setupStore([makeWall(), makeWall({ id: 'w2', label: 'B-C', sortOrder: 1 })]);
    render(<PerimeterWalkStep />);
    expect(screen.getByRole('button', { name: 'A-B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B-C' })).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    setupStore([makeWall()], { w1: [makeSegment({ length: 2.0 })] });
    render(<PerimeterWalkStep />);
    expect(screen.getByText(/Сумма сегментов/i)).toBeInTheDocument();
    expect(screen.getByText(/Длина стены/i)).toBeInTheDocument();
  });

  it('shows warning when diff > 20mm', () => {
    // wall = 4.02m, segments sum = 3.95m → diff = 70mm
    setupStore([makeWall()], { w1: [makeSegment({ length: 3.95 })] });
    render(<PerimeterWalkStep />);
    expect(screen.getByText(/рекомендуется перемерить/i)).toBeInTheDocument();
  });

  it('does not show warning when diff is small', () => {
    // wall = 4.02m, segments sum = 4.015m → diff = 5mm
    setupStore([makeWall()], { w1: [makeSegment({ length: 4.015 })] });
    render(<PerimeterWalkStep />);
    expect(screen.queryByText(/рекомендуется перемерить/i)).not.toBeInTheDocument();
  });

  it('renders existing segments list', () => {
    setupStore([makeWall()], {
      w1: [makeSegment({ id: 's1', segmentType: 'WINDOW', length: 1.5 })],
    });
    render(<PerimeterWalkStep />);
    expect(screen.getAllByText(/Окно/i).length).toBeGreaterThan(0);
  });

  it('adds a plain segment on form submit', async () => {
    const created = makeSegment({ id: 's-new', segmentType: 'PLAIN', length: 2.0 });
    vi.mocked(segmentsApi.create).mockResolvedValue(created);

    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);

    fireEvent.change(screen.getByLabelText(/Длина, м/i), { target: { value: '2.0' } });
    fireEvent.click(screen.getByRole('button', { name: /добавить/i }));

    await waitFor(() => {
      expect(segmentsApi.create).toHaveBeenCalledWith('w1', expect.objectContaining({
        segmentType: 'PLAIN',
        length: 2,
      }));
      expect(mockUpsertSegment).toHaveBeenCalledWith('w1', created);
    });
  });

  it('auto-creates window opening when adding WINDOW segment', async () => {
    const createdSeg = makeSegment({ id: 's-win', segmentType: 'WINDOW', length: 1.2 });
    const createdWin = { id: 'win1', wallId: 'w1', width: 1200, height: 0, sillHeightFromScreed: 0 };
    vi.mocked(segmentsApi.create).mockResolvedValue(createdSeg);
    vi.mocked(openingsApi.windows.create).mockResolvedValue(createdWin as never);

    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);

    // Change type to WINDOW
    fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'WINDOW' } });
    fireEvent.change(screen.getByLabelText(/Длина, м/i), { target: { value: '1.2' } });
    fireEvent.click(screen.getByRole('button', { name: /добавить/i }));

    await waitFor(() => {
      expect(openingsApi.windows.create).toHaveBeenCalledWith('w1', expect.objectContaining({ width: 1200 }));
      expect(mockUpsertWindow).toHaveBeenCalledWith('w1', createdWin);
    });
  });

  it('removes segment when ✕ clicked', async () => {
    vi.mocked(segmentsApi.remove).mockResolvedValue(undefined as never);

    setupStore([makeWall()], { w1: [makeSegment()] });
    render(<PerimeterWalkStep />);

    fireEvent.click(screen.getByText('✕'));

    await waitFor(() => {
      expect(mockRemoveSegment).toHaveBeenCalledWith('w1', 's1');
    });
  });

  it('shows validate button when segments exist', () => {
    setupStore([makeWall()], { w1: [makeSegment()] });
    render(<PerimeterWalkStep />);
    expect(screen.getByRole('button', { name: /Проверить сумму/i })).toBeInTheDocument();
  });

  it('shows validation result when valid', async () => {
    vi.mocked(segmentsApi.validate).mockResolvedValue({
      isValid: true,
      difference: 0,
      wallLength: 4.02,
      segmentsSum: 4.02,
    });

    setupStore([makeWall()], { w1: [makeSegment({ length: 4.02 })] });
    render(<PerimeterWalkStep />);

    fireEvent.click(screen.getByRole('button', { name: /Проверить сумму/i }));

    await waitFor(() => {
      expect(screen.getByText(/корректно/i)).toBeInTheDocument();
    });
  });

  it('shows validation result when invalid', async () => {
    vi.mocked(segmentsApi.validate).mockResolvedValue({
      isValid: false,
      difference: -0.05,
      wallLength: 4.02,
      segmentsSum: 3.97,
    });

    setupStore([makeWall()], { w1: [makeSegment({ length: 3.97 })] });
    render(<PerimeterWalkStep />);

    fireEvent.click(screen.getByRole('button', { name: /Проверить сумму/i }));

    await waitFor(() => {
      expect(screen.getByText(/перемерьте стену/i)).toBeInTheDocument();
    });
  });

  it('shows "Следующая стена" when not on last wall', () => {
    setupStore([
      makeWall(),
      makeWall({ id: 'w2', label: 'B-C', sortOrder: 1 }),
    ]);
    render(<PerimeterWalkStep />);
    expect(screen.getByRole('button', { name: /Следующая стена/i })).toBeInTheDocument();
  });

  it('shows "Далее → Проёмы" on last wall', () => {
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    expect(screen.getByRole('button', { name: /Проёмы/i })).toBeInTheDocument();
  });

  it('navigates to substep 5 on last wall next click', () => {
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    fireEvent.click(screen.getByRole('button', { name: /Проёмы/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(5);
  });

  it('navigates back to substep 3 on back click', () => {
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    fireEvent.click(screen.getByRole('button', { name: /назад/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(3);
  });
});
