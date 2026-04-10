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

// WallMiniMap relies on currentRoom being non-null; mock it to avoid SVG complexity in tests
vi.mock('../../../../components/WallMiniMap', () => ({
  WallMiniMap: () => <div data-testid="wall-mini-map" />,
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

const makeRoom = () => ({
  id: 'r1',
  projectId: 'p1',
  name: 'Гостиная',
  type: 'LIVING_ROOM' as const,
  shape: 'RECTANGLE' as const,
  ceilingHeight1: null,
  ceilingHeight2: null,
  sortOrder: 0,
  isMeasured: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

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
  offsetFromPrev: null,
  isInner: null,
  windowOpeningId: null,
  doorOpeningId: null,
  leadsToRoomId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const setupStore = (walls = [makeWall()], segments: Record<string, ReturnType<typeof makeSegment>[]> = {}) => {
  vi.mocked(useRoomMeasureStore).mockReturnValue({
    currentRoom: makeRoom(),
    shapeOrientation: 0 as const,
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

  it('renders progress dot for each wall', () => {
    setupStore([makeWall(), makeWall({ id: 'w2', label: 'B-C', cornerFrom: 'B', cornerTo: 'C', sortOrder: 1 })]);
    render(<PerimeterWalkStep />);
    const dots = screen.getAllByRole('button', { name: /Стена [A-Z]–[A-Z]/i });
    expect(dots).toHaveLength(2);
  });

  it('shows wall index and corner label', () => {
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    expect(screen.getByText(/Стена 1 из 1/i)).toBeInTheDocument();
    expect(screen.getByText(/A–B/)).toBeInTheDocument();
  });

  it('renders WallMiniMap', () => {
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    expect(screen.getByTestId('wall-mini-map')).toBeInTheDocument();
  });

  it('shows progress bar with segment sum and wall length', () => {
    setupStore([makeWall()], { w1: [makeSegment({ length: 2.0 })] });
    render(<PerimeterWalkStep />);
    expect(screen.getByText(/Сумма:/i)).toBeInTheDocument();
    expect(screen.getByText(/Стена:/i)).toBeInTheDocument();
  });

  it('shows warning when diff > 20mm and segments exist', () => {
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

  it('does not show warning when no segments yet', () => {
    setupStore([makeWall()]);
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

  it('pre-fills length field with remainder (wall - segments sum)', () => {
    // wall = 4.02m, existing segments = 2.0m → remainder = 2.02
    setupStore([makeWall()], { w1: [makeSegment({ length: 2.0 })] });
    render(<PerimeterWalkStep />);
    const input = screen.getByLabelText(/Длина участка, м/i) as HTMLInputElement;
    expect(Number(input.value)).toBeCloseTo(2.02, 3);
  });

  it('pre-fills with 0 remainder when segments cover full wall', () => {
    // wall = 4.02m, segments = 4.02m → remainder = 0 → empty field
    setupStore([makeWall()], { w1: [makeSegment({ length: 4.02 })] });
    render(<PerimeterWalkStep />);
    const input = screen.getByLabelText(/Длина участка, м/i) as HTMLInputElement;
    expect(Number(input.value)).toBe(0);
  });

  it('adds a plain segment on form submit', async () => {
    const created = makeSegment({ id: 's-new', segmentType: 'PLAIN', length: 2.0 });
    vi.mocked(segmentsApi.create).mockResolvedValue(created);

    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);

    fireEvent.change(screen.getByLabelText(/Длина участка, м/i), { target: { value: '2.0' } });
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

    fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'WINDOW' } });
    fireEvent.change(screen.getByLabelText(/Ширина проёма, м/i), { target: { value: '1.2' } });
    fireEvent.click(screen.getByRole('button', { name: /добавить/i }));

    await waitFor(() => {
      expect(openingsApi.windows.create).toHaveBeenCalledWith('w1', expect.objectContaining({ width: 1200 }));
      expect(mockUpsertWindow).toHaveBeenCalledWith('w1', createdWin);
    });
  });

  it('does not show offsetFromPrev field', () => {
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    expect(screen.queryByLabelText(/Отступ от начала/i)).not.toBeInTheDocument();
    // Still absent after switching to WINDOW
    fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'WINDOW' } });
    expect(screen.queryByLabelText(/Отступ от начала/i)).not.toBeInTheDocument();
  });

  it('shows inner/outer toggle only for STEP type', () => {
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    expect(screen.queryByText(/Внутренняя/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'STEP' } });
    expect(screen.getByText(/Внутренняя/i)).toBeInTheDocument();
    expect(screen.getByText(/Внешняя/i)).toBeInTheDocument();
  });

  it('uses context-aware label for DOOR type', () => {
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'DOOR' } });
    expect(screen.getByLabelText(/Ширина проёма, м/i)).toBeInTheDocument();
  });

  it('adds WINDOW segment without offsetFromPrev', async () => {
    const created = makeSegment({ id: 's-win', segmentType: 'WINDOW', length: 1.2 });
    vi.mocked(segmentsApi.create).mockResolvedValue(created);

    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);

    fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'WINDOW' } });
    fireEvent.change(screen.getByLabelText(/Ширина проёма, м/i), { target: { value: '1.2' } });
    fireEvent.click(screen.getByRole('button', { name: /добавить/i }));

    await waitFor(() => {
      expect(segmentsApi.create).toHaveBeenCalledWith('w1', expect.objectContaining({
        segmentType: 'WINDOW',
        length: 1.2,
      }));
      expect(segmentsApi.create).toHaveBeenCalledWith('w1', expect.not.objectContaining({
        offsetFromPrev: expect.anything(),
      }));
    });
  });

  it('does not display offsetFromPrev in segment list', () => {
    setupStore([makeWall()], {
      w1: [makeSegment({ segmentType: 'WINDOW', length: 1.2, offsetFromPrev: 0.5 })],
    });
    render(<PerimeterWalkStep />);
    expect(screen.queryByText('+0.500')).not.toBeInTheDocument();
  });

  it('displays STEP type with isInner label in segment list', () => {
    setupStore([makeWall()], {
      w1: [makeSegment({ segmentType: 'STEP', length: 0.3, isInner: true })],
    });
    render(<PerimeterWalkStep />);
    expect(screen.getByText(/Ступенька.*внутренняя/i)).toBeInTheDocument();
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
      makeWall({ id: 'w2', label: 'B-C', cornerFrom: 'B', cornerTo: 'C', sortOrder: 1 }),
    ]);
    render(<PerimeterWalkStep />);
    expect(screen.getByRole('button', { name: /Следующая стена/i })).toBeInTheDocument();
  });

  it('shows "Далее → Проёмы" on last wall', () => {
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    expect(screen.getByRole('button', { name: /Проёмы/i })).toBeInTheDocument();
  });

  it('navigates to substep 5 on last wall next click without requiring segments', () => {
    // Skip is valid — no segments needed
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    fireEvent.click(screen.getByRole('button', { name: /Проёмы/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(5);
  });

  it('navigates back to substep 3 on first wall back click', () => {
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    fireEvent.click(screen.getByRole('button', { name: /назад/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(3);
  });

  it('shows "← Назад" to go to previous wall when not on first wall', () => {
    setupStore([
      makeWall(),
      makeWall({ id: 'w2', label: 'B-C', cornerFrom: 'B', cornerTo: 'C', sortOrder: 1 }),
    ]);
    render(<PerimeterWalkStep />);
    // Click "Следующая стена" to go to wall 2
    fireEvent.click(screen.getByRole('button', { name: /Следующая стена/i }));
    // Now "← Назад" should NOT call setSubstep(3) but go to wall 1
    fireEvent.click(screen.getByRole('button', { name: /назад/i }));
    expect(mockSetSubstep).not.toHaveBeenCalled();
  });

  it('shows heading "3.4 Детализация стен"', () => {
    setupStore([makeWall()]);
    render(<PerimeterWalkStep />);
    expect(screen.getByText(/3\.4 Детализация стен/i)).toBeInTheDocument();
  });
});
