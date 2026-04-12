import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WallElevationStep } from '../WallElevationStep';
import { useRoomMeasureStore } from '../../../../stores/roomMeasureStore';

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../../../../stores/roomMeasureStore', () => ({
  useRoomMeasureStore: vi.fn(),
}));

vi.mock('../../../../api/walls', () => ({
  wallsApi: { update: vi.fn() },
}));

vi.mock('../../../../api/elements', () => ({
  elementsApi: {
    create: vi.fn(),
    remove: vi.fn(),
  },
}));

import { wallsApi } from '../../../../api/walls';
import { elementsApi } from '../../../../api/elements';

const mockSetSubstep = vi.fn();
const mockUpsertWall = vi.fn();
const mockUpsertElement = vi.fn();
const mockRemoveElement = vi.fn();

const makeRoom = () => ({
  id: 'r1',
  projectId: 'p1',
  name: 'Гостиная',
  type: 'LIVING_ROOM' as const,
  shape: 'RECTANGLE' as const,
  ceilingHeight1: 2.68,
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

const makeElement = (overrides = {}) => ({
  id: 'el1',
  roomId: 'r1',
  wallId: 'w1',
  elementType: 'RADIATOR' as const,
  positionX: null,
  offsetFromFloor: null,
  width: null,
  height: null,
  depth: null,
  offsetFromWall: null,
  cornerLabel: null,
  description: null,
  photoPath: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const setupStore = (
  walls = [makeWall()],
  elements: ReturnType<typeof makeElement>[] = [],
  segments: Record<string, unknown[]> = {},
) => {
  vi.mocked(useRoomMeasureStore).mockReturnValue({
    currentRoom: makeRoom(),
    walls,
    elements,
    segments,
    upsertWall: mockUpsertWall,
    upsertElement: mockUpsertElement,
    removeElement: mockRemoveElement,
    setSubstep: mockSetSubstep,
  } as ReturnType<typeof useRoomMeasureStore>);
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('WallElevationStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it('shows empty-walls fallback when no walls', () => {
    setupStore([]);
    render(<WallElevationStep />);
    expect(screen.getByText(/Нет стен/i)).toBeInTheDocument();
  });

  it('renders wall tabs', () => {
    setupStore([
      makeWall({ label: 'A-B' }),
      makeWall({ id: 'w2', label: 'B-C', sortOrder: 1 }),
    ]);
    render(<WallElevationStep />);
    expect(screen.getByRole('button', { name: 'A-B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B-C' })).toBeInTheDocument();
  });

  it('renders SVG elevation diagram', () => {
    render(<WallElevationStep />);
    expect(screen.getByLabelText(/Развёртка стены A-B/i)).toBeInTheDocument();
  });

  it('renders curvature form fields', () => {
    render(<WallElevationStep />);
    expect(screen.getByLabelText(/Низ/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Середина/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Верх/i)).toBeInTheDocument();
  });

  it('pre-fills curvature from existing wall data', () => {
    setupStore([makeWall({ curvatureBottom: 0.01, curvatureMiddle: 0.02, curvatureTop: 0.03 })]);
    render(<WallElevationStep />);
    expect(screen.getByLabelText(/Низ/i)).toHaveValue(0.01);
    expect(screen.getByLabelText(/Середина/i)).toHaveValue(0.02);
    expect(screen.getByLabelText(/Верх/i)).toHaveValue(0.03);
  });

  it('saves curvature on form submit', async () => {
    const updated = makeWall({ curvatureBottom: 0.01 });
    vi.mocked(wallsApi.update).mockResolvedValue(updated);

    render(<WallElevationStep />);
    fireEvent.change(screen.getByLabelText(/Низ/i), { target: { value: '0.01' } });
    fireEvent.submit(screen.getByLabelText(/Низ/i).closest('form')!);

    await waitFor(() => {
      expect(wallsApi.update).toHaveBeenCalledWith('r1', 'w1', expect.objectContaining({
        curvatureBottom: 0.01,
      }));
      expect(mockUpsertWall).toHaveBeenCalledWith(updated);
    });
  });

  it('renders add element form', () => {
    render(<WallElevationStep />);
    expect(screen.getByRole('button', { name: /Добавить элемент/i })).toBeInTheDocument();
  });

  it('adds an element on form submit', async () => {
    const created = makeElement({ id: 'el-new', elementType: 'RADIATOR' });
    vi.mocked(elementsApi.create).mockResolvedValue(created);

    render(<WallElevationStep />);
    fireEvent.submit(screen.getByRole('button', { name: /Добавить элемент/i }).closest('form')!);

    await waitFor(() => {
      expect(elementsApi.create).toHaveBeenCalledWith('r1', expect.objectContaining({
        elementType: 'RADIATOR',
        wallId: 'w1',
      }));
      expect(mockUpsertElement).toHaveBeenCalledWith(created);
    });
  });

  it('renders elements list for current wall', () => {
    setupStore([makeWall()], [makeElement({ elementType: 'RADIATOR', description: 'Основной' })]);
    render(<WallElevationStep />);
    expect(screen.getAllByText(/Радиатор/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/— Основной/i)).toBeInTheDocument();
  });

  it('removes element on ✕ click', async () => {
    vi.mocked(elementsApi.remove).mockResolvedValue(undefined as never);
    setupStore([makeWall()], [makeElement()]);
    render(<WallElevationStep />);

    fireEvent.click(screen.getByText('✕'));

    await waitFor(() => {
      expect(mockRemoveElement).toHaveBeenCalledWith('el1');
    });
  });

  it('shows "Следующая стена" when not on last wall', () => {
    setupStore([
      makeWall({ label: 'A-B' }),
      makeWall({ id: 'w2', label: 'B-C', sortOrder: 1 }),
    ]);
    render(<WallElevationStep />);
    expect(screen.getByRole('button', { name: /Следующая стена/i })).toBeInTheDocument();
  });

  it('shows "Далее → Фото" on last wall', () => {
    render(<WallElevationStep />);
    expect(screen.getByRole('button', { name: /Фото/i })).toBeInTheDocument();
  });

  it('navigates to substep 7 on last wall next click', () => {
    render(<WallElevationStep />);
    fireEvent.click(screen.getByRole('button', { name: /Фото/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(7);
  });

  it('navigates back to substep 5', () => {
    render(<WallElevationStep />);
    fireEvent.click(screen.getByRole('button', { name: /назад/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(5);
  });

  // ── Decimal input tests ────────────────────────────────────────────────

  it('element positionX field has step="0.001" to allow 3-decimal meter values', () => {
    render(<WallElevationStep />);
    const positionInput = screen.getByLabelText(/Позиция от нач. стены/i);
    expect(positionInput).toHaveAttribute('step', '0.001');
  });

  it('element offsetFromFloor field has step="0.001" to allow 3-decimal meter values', () => {
    render(<WallElevationStep />);
    const offsetInput = screen.getByLabelText(/Высота от пола/i);
    expect(offsetInput).toHaveAttribute('step', '0.001');
  });

  it('element width field has step="0.001" to allow 3-decimal meter values', () => {
    render(<WallElevationStep />);
    const widthInput = screen.getByLabelText(/Ширина, м/i);
    expect(widthInput).toHaveAttribute('step', '0.001');
  });

  it('adds element with 3-decimal meter positionX (e.g. 1.125)', async () => {
    const created = makeElement({ id: 'el-new', positionX: 1125 });
    vi.mocked(elementsApi.create).mockResolvedValue(created);

    render(<WallElevationStep />);
    fireEvent.change(screen.getByLabelText(/Позиция от нач. стены/i), { target: { value: '1.125' } });
    fireEvent.submit(screen.getByRole('button', { name: /Добавить элемент/i }).closest('form')!);

    await waitFor(() => {
      expect(elementsApi.create).toHaveBeenCalledWith('r1', expect.objectContaining({
        positionX: 1125,
      }));
    });
  });

  it('shows error message when element create fails', async () => {
    vi.mocked(elementsApi.create).mockRejectedValue(new Error('Ошибка добавления'));

    render(<WallElevationStep />);
    fireEvent.submit(screen.getByRole('button', { name: /Добавить элемент/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Ошибка добавления/i)).toBeInTheDocument();
    });
  });
});
