import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, assertType } from 'vitest';
import { OpeningsStep } from '../OpeningsStep';
import { useRoomMeasureStore } from '../../../../stores/roomMeasureStore';

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../../../../stores/roomMeasureStore', () => ({
  useRoomMeasureStore: vi.fn(),
}));

vi.mock('../../../../api/openings', () => ({
  openingsApi: {
    windows: { list: vi.fn(), update: vi.fn() },
    doors: { list: vi.fn(), update: vi.fn() },
  },
}));

import { openingsApi } from '../../../../api/openings';

const mockSetSubstep = vi.fn();
const mockSetWindows = vi.fn();
const mockSetDoors = vi.fn();
const mockUpsertWindow = vi.fn();
const mockUpsertDoor = vi.fn();

// Type-cast for mocking
const mockedUseRoomMeasureStore = useRoomMeasureStore as ReturnType<typeof vi.fn>;
const mockedOpeningsWindowsList = (openingsApi.windows.list as any) as ReturnType<typeof vi.fn>;
const mockedOpeningsWindowsUpdate = (openingsApi.windows.update as any) as ReturnType<typeof vi.fn>;
const mockedOpeningsDoorsList = (openingsApi.doors.list as any) as ReturnType<typeof vi.fn>;
const mockedOpeningsDoorsUpdate = (openingsApi.doors.update as any) as ReturnType<typeof vi.fn>;

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

const makeWindow = (overrides = {}) => ({
  id: 'win1',
  wallId: 'w1',
  width: 1200,
  height: 1400,
  sillHeightFromScreed: 900,
  revealWidthLeft: null,
  revealWidthRight: null,
  isFrenchDoor: false,
  photoPath: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeDoor = (overrides = {}) => ({
  id: 'door1',
  wallId: 'w1',
  width: 900,
  heightFromScreed: 2100,
  revealLeft: null,
  revealRight: null,
  isFrenchDoor: false,
  photoPath: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeSegmentWithWindow = () => ({
  id: 's1',
  wallId: 'w1',
  segmentType: 'WINDOW' as const,
  length: 1.2,
  sortOrder: 0,
  description: null,
  depth: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const setupStore = (
  walls = [makeWall()],
  windows: Record<string, ReturnType<typeof makeWindow>[]> = {},
  doors: Record<string, ReturnType<typeof makeDoor>[]> = {},
  segments: Record<string, ReturnType<typeof makeSegmentWithWindow>[]> = {},
) => {
  mockedUseRoomMeasureStore.mockReturnValue({
    walls,
    windows,
    doors,
    segments,
    setWindows: mockSetWindows,
    setDoors: mockSetDoors,
    upsertWindow: mockUpsertWindow,
    upsertDoor: mockUpsertDoor,
    setSubstep: mockSetSubstep,
  } as ReturnType<typeof useRoomMeasureStore>);
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('OpeningsStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedOpeningsWindowsList.mockResolvedValue([]);
    mockedOpeningsDoorsList.mockResolvedValue([]);
  });

  it('shows loading state initially when walls have segments', async () => {
    setupStore(
      [makeWall()],
      {},
      {},
      { w1: [makeSegmentWithWindow()] },
    );
    render(<OpeningsStep />);
    expect(screen.getByText(/Загрузка/i)).toBeInTheDocument();
  });

  it('shows empty-openings notice when no windows or doors', async () => {
    vi.mocked(openingsApi.windows.list).mockResolvedValue([]);
    vi.mocked(openingsApi.doors.list).mockResolvedValue([]);
    setupStore([makeWall()], {}, {}, {});
    render(<OpeningsStep />);
    await waitFor(() => {
      expect(screen.getByText(/Нет проёмов/i)).toBeInTheDocument();
    });
  });

  it('renders window card when window exists in store', () => {
    setupStore(
      [makeWall()],
      { w1: [makeWindow()] },
      {},
      {},
    );
    render(<OpeningsStep />);
    expect(screen.getByText(/Окно — ширина/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.200 м/i)).toBeInTheDocument();
  });

  it('renders door card when door exists in store', () => {
    setupStore(
      [makeWall()],
      {},
      { w1: [makeDoor()] },
      {},
    );
    render(<OpeningsStep />);
    expect(screen.getByText(/Дверь — ширина/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.900 м/i)).toBeInTheDocument();
  });

  it('renders both windows and doors when both exist', () => {
    setupStore(
      [makeWall()],
      { w1: [makeWindow()] },
      { w1: [makeDoor()] },
      {},
    );
    render(<OpeningsStep />);
    expect(screen.getByText(/Окно — ширина/i)).toBeInTheDocument();
    expect(screen.getByText(/Дверь — ширина/i)).toBeInTheDocument();
  });

  it('saves window on form submit', async () => {
    const updated = makeWindow({ height: 1500000 });
    mockedOpeningsWindowsUpdate.mockResolvedValue(updated);

    setupStore(
      [makeWall()],
      { w1: [makeWindow({ height: 0 })] },
      {},
      {},
    );
    render(<OpeningsStep />);

    const heightInput = screen.getByLabelText(/Высота, м/i);
    fireEvent.change(heightInput, { target: { value: '1.5' } });

    const saveBtn = screen.getByRole('button', { name: /Сохранить/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockedOpeningsWindowsUpdate).toHaveBeenCalledWith(
        'w1',
        'win1',
        expect.objectContaining({ height: 1500 }),
      );
      expect(mockUpsertWindow).toHaveBeenCalledWith('w1', updated);
    });
  });

  it('saves door on form submit', async () => {
    const updated = makeDoor({ heightFromScreed: 2200000 });
    mockedOpeningsDoorsUpdate.mockResolvedValue(updated);

    setupStore(
      [makeWall()],
      {},
      { w1: [makeDoor({ heightFromScreed: 0 })] },
      {},
    );
    render(<OpeningsStep />);

    const heightInput = screen.getByLabelText(/Высота от стяжки, м/i);
    fireEvent.change(heightInput, { target: { value: '2.2' } });

    fireEvent.click(screen.getByRole('button', { name: /Сохранить/i }));

    await waitFor(() => {
      expect(mockedOpeningsDoorsUpdate).toHaveBeenCalledWith(
        'w1',
        'door1',
        expect.objectContaining({ heightFromScreed: 2200 }),
      );
      expect(mockUpsertDoor).toHaveBeenCalledWith('w1', updated);
    });
  });

  it('shows navigation buttons', () => {
    setupStore();
    render(<OpeningsStep />);
    expect(screen.getByRole('button', { name: /назад/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Развёртка/i })).toBeInTheDocument();
  });

  it('navigates back to substep 4', () => {
    setupStore();
    render(<OpeningsStep />);
    fireEvent.click(screen.getByRole('button', { name: /назад/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(4);
  });

  it('navigates to substep 6 on next click', () => {
    setupStore();
    render(<OpeningsStep />);
    fireEvent.click(screen.getByRole('button', { name: /Развёртка/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(6);
  });

  // ── Decimal input tests (meter values) ────────────────────────────────────

  it('window height field accepts text input for meter values', () => {
    setupStore([makeWall()], { w1: [makeWindow()] }, {}, {});
    render(<OpeningsStep />);
    const heightInput = screen.getByLabelText(/Высота, м/i);
    expect(heightInput).toHaveAttribute('type', 'text');
    expect(heightInput).toHaveAttribute('inputMode', 'decimal');
  });

  it('window sill height field accepts text input for meter values', () => {
    setupStore([makeWall()], { w1: [makeWindow()] }, {}, {});
    render(<OpeningsStep />);
    const sillInput = screen.getByLabelText(/Высота подоконника от стяжки/i);
    expect(sillInput).toHaveAttribute('type', 'text');
    expect(sillInput).toHaveAttribute('inputMode', 'decimal');
  });

  it('window reveal fields accept text input for meter values', () => {
    setupStore([makeWall()], { w1: [makeWindow()] }, {}, {});
    render(<OpeningsStep />);
    const [revealLeft, revealRight] = screen.getAllByLabelText(/Откос.*м/i);
    expect(revealLeft).toHaveAttribute('type', 'text');
    expect(revealLeft).toHaveAttribute('inputMode', 'decimal');
    expect(revealRight).toHaveAttribute('type', 'text');
    expect(revealRight).toHaveAttribute('inputMode', 'decimal');
  });

  it('door height field accepts text input for meter values', () => {
    setupStore([makeWall()], {}, { w1: [makeDoor()] }, {});
    render(<OpeningsStep />);
    const heightInput = screen.getByLabelText(/Высота от стяжки, м/i);
    expect(heightInput).toHaveAttribute('type', 'text');
    expect(heightInput).toHaveAttribute('inputMode', 'decimal');
  });

  it('door reveal fields accept text input for meter values', () => {
    setupStore([makeWall()], {}, { w1: [makeDoor()] }, {});
    render(<OpeningsStep />);
    const [revealLeft, revealRight] = screen.getAllByLabelText(/Откос.*м/i);
    expect(revealLeft).toHaveAttribute('type', 'text');
    expect(revealLeft).toHaveAttribute('inputMode', 'decimal');
    expect(revealRight).toHaveAttribute('type', 'text');
    expect(revealRight).toHaveAttribute('inputMode', 'decimal');
  });

  it('saves window with decimal meter values (e.g. 1.125)', async () => {
    const updated = makeWindow({ height: 1125 });
    mockedOpeningsWindowsUpdate.mockResolvedValue(updated);

    setupStore([makeWall()], { w1: [makeWindow({ height: 0 })] }, {}, {});
    render(<OpeningsStep />);

    fireEvent.change(screen.getByLabelText(/Высота, м/i), { target: { value: '1.125' } });
    fireEvent.click(screen.getByRole('button', { name: /Сохранить/i }));

    await waitFor(() => {
      expect(mockedOpeningsWindowsUpdate).toHaveBeenCalledWith(
        'w1', 'win1',
        expect.objectContaining({ height: 1125 }),
      );
    });
  });

  it('saves door with decimal meter height (e.g. 2.1)', async () => {
    const updated = makeDoor({ heightFromScreed: 2100 });
    mockedOpeningsDoorsUpdate.mockResolvedValue(updated);

    setupStore([makeWall()], {}, { w1: [makeDoor({ heightFromScreed: 0 })] }, {});
    render(<OpeningsStep />);

    fireEvent.change(screen.getByLabelText(/Высота от стяжки, м/i), { target: { value: '2.1' } });
    fireEvent.click(screen.getByRole('button', { name: /Сохранить/i }));

    await waitFor(() => {
      expect(mockedOpeningsDoorsUpdate).toHaveBeenCalledWith(
        'w1', 'door1',
        expect.objectContaining({ heightFromScreed: 2100 }),
      );
    });
  });

  it('converts comma decimal separator to dot in window height', async () => {
    const updated = makeWindow({ height: 1400 });
    vi.mocked(openingsApi.windows.update).mockResolvedValue(updated);

    setupStore([makeWall()], { w1: [makeWindow({ height: 0 })] }, {}, {});
    render(<OpeningsStep />);

    fireEvent.change(screen.getByLabelText(/Высота, м/i), { target: { value: '1,4' } });
    fireEvent.click(screen.getByRole('button', { name: /Сохранить/i }));

    await waitFor(() => {
      expect(openingsApi.windows.update).toHaveBeenCalledWith(
        'w1', 'win1',
        expect.objectContaining({ height: 1400 }),
      );
    });
  });

  it('shows wall label for each wall with openings', () => {
    setupStore(
      [makeWall({ label: 'A-B' }), makeWall({ id: 'w2', label: 'B-C', sortOrder: 1 })],
      { w1: [makeWindow()], w2: [makeWindow({ id: 'win2', wallId: 'w2' })] },
      {},
      {},
    );
    render(<OpeningsStep />);
    expect(screen.getByText(/Стена A-B/i)).toBeInTheDocument();
    expect(screen.getByText(/Стена B-C/i)).toBeInTheDocument();
  });
});
