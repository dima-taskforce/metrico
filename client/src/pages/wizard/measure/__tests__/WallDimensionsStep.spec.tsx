import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WallDimensionsStep } from '../WallDimensionsStep';
import { useRoomMeasureStore } from '../../../../stores/roomMeasureStore';

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../../../../stores/roomMeasureStore', () => ({
  useRoomMeasureStore: vi.fn(),
}));

vi.mock('../../../../api/walls', () => ({
  wallsApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

import { wallsApi } from '../../../../api/walls';

const mockSetSubstep = vi.fn();
const mockSetWalls = vi.fn();
const mockUpsertWall = vi.fn();

const makeRoom = (shape: 'RECTANGLE' | 'L_SHAPE' = 'RECTANGLE') => ({
  id: 'r1',
  projectId: 'p1',
  name: 'Гостиная',
  type: 'LIVING_ROOM' as const,
  shape,
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

const setupStore = (walls: ReturnType<typeof makeWall>[] = []) => {
  vi.mocked(useRoomMeasureStore).mockReturnValue({
    currentRoom: makeRoom(),
    walls,
    setWalls: mockSetWalls,
    upsertWall: mockUpsertWall,
    setSubstep: mockSetSubstep,
  } as ReturnType<typeof useRoomMeasureStore>);
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('WallDimensionsStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it('renders 4 wall inputs for RECTANGLE', () => {
    render(<WallDimensionsStep />);
    expect(screen.getByText('Стена A–B')).toBeInTheDocument();
    expect(screen.getByText('Стена B–C')).toBeInTheDocument();
    expect(screen.getByText('Стена C–D')).toBeInTheDocument();
    expect(screen.getByText('Стена D–A')).toBeInTheDocument();
  });

  it('marks C-D and D-A walls as auto-filled for rectangle', () => {
    render(<WallDimensionsStep />);
    const autoTags = screen.getAllByText('(авто)');
    expect(autoTags).toHaveLength(2);
  });

  it('shows rectangle hint for RECTANGLE shape', () => {
    render(<WallDimensionsStep />);
    expect(screen.getByText(/C-D и D-A/i)).toBeInTheDocument();
  });

  it('renders 6 walls for L_SHAPE', () => {
    vi.mocked(useRoomMeasureStore).mockReturnValue({
      currentRoom: makeRoom('L_SHAPE'),
      walls: [],
      setWalls: mockSetWalls,
      upsertWall: mockUpsertWall,
      setSubstep: mockSetSubstep,
    } as ReturnType<typeof useRoomMeasureStore>);
    render(<WallDimensionsStep />);
    expect(screen.getByText('Стена A–B')).toBeInTheDocument();
    expect(screen.getByText('Стена F–A')).toBeInTheDocument();
  });

  it('shows navigation buttons', () => {
    render(<WallDimensionsStep />);
    expect(screen.getByRole('button', { name: /назад/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /периметр/i })).toBeInTheDocument();
  });

  it('navigates back to substep 2 on back click', () => {
    render(<WallDimensionsStep />);
    fireEvent.click(screen.getByRole('button', { name: /назад/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(2);
  });

  it('shows validation error for zero-length wall', async () => {
    render(<WallDimensionsStep />);
    // Submit without filling lengths
    fireEvent.click(screen.getByRole('button', { name: /периметр/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/Длина должна быть > 0/i)[0]).toBeInTheDocument();
    });
  });

  it('creates new walls on submit and advances to substep 4', async () => {
    const created = makeWall({ id: 'w-new' });
    vi.mocked(wallsApi.create).mockResolvedValue(created);

    render(<WallDimensionsStep />);

    // Fill A-B and B-C lengths (C-D and D-A are auto-filled)
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0]!, { target: { value: '4.02' } });
    fireEvent.change(inputs[1]!, { target: { value: '2.89' } });

    fireEvent.click(screen.getByRole('button', { name: /периметр/i }));

    await waitFor(() => {
      expect(wallsApi.create).toHaveBeenCalled();
      expect(mockSetSubstep).toHaveBeenCalledWith(4);
    });
  });

  it('updates existing wall and advances to substep 4', async () => {
    const existing = makeWall({ cornerFrom: 'A', cornerTo: 'B', length: 4.02 });
    const updated = makeWall({ id: 'w1', length: 5.0 });
    vi.mocked(wallsApi.update).mockResolvedValue(updated);

    vi.mocked(useRoomMeasureStore).mockReturnValue({
      currentRoom: makeRoom(),
      walls: [existing],
      setWalls: mockSetWalls,
      upsertWall: mockUpsertWall,
      setSubstep: mockSetSubstep,
    } as ReturnType<typeof useRoomMeasureStore>);

    vi.mocked(wallsApi.create).mockResolvedValue(makeWall({ id: 'w-new' }));

    render(<WallDimensionsStep />);

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0]!, { target: { value: '5.0' } });
    fireEvent.change(inputs[1]!, { target: { value: '2.89' } });

    fireEvent.click(screen.getByRole('button', { name: /периметр/i }));

    await waitFor(() => {
      expect(wallsApi.update).toHaveBeenCalledWith('r1', 'w1', expect.objectContaining({ length: 5 }));
      expect(mockSetSubstep).toHaveBeenCalledWith(4);
    });
  });

  it('shows error message when API call fails', async () => {
    vi.mocked(wallsApi.create).mockRejectedValue(new Error('Ошибка сети'));

    render(<WallDimensionsStep />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0]!, { target: { value: '4.0' } });
    fireEvent.change(inputs[1]!, { target: { value: '3.0' } });

    fireEvent.click(screen.getByRole('button', { name: /периметр/i }));

    await waitFor(() => {
      expect(screen.getByText(/Ошибка сети/i)).toBeInTheDocument();
    });
  });

  it('pre-fills length from existing walls', () => {
    const walls = [makeWall({ cornerFrom: 'A', cornerTo: 'B', length: 4.02 })];
    vi.mocked(useRoomMeasureStore).mockReturnValue({
      currentRoom: makeRoom(),
      walls,
      setWalls: mockSetWalls,
      upsertWall: mockUpsertWall,
      setSubstep: mockSetSubstep,
    } as ReturnType<typeof useRoomMeasureStore>);

    render(<WallDimensionsStep />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0]).toHaveValue(4.02);
  });
});
