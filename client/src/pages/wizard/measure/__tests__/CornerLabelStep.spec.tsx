import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CornerLabelStep } from '../CornerLabelStep';
import { useRoomMeasureStore } from '../../../../stores/roomMeasureStore';

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../../../../stores/roomMeasureStore', () => ({
  useRoomMeasureStore: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

const mockSetSubstep = vi.fn();

const makeRoom = (shape: 'RECTANGLE' | 'L_SHAPE' | 'U_SHAPE' | 'T_SHAPE' | 'CUSTOM' = 'RECTANGLE') => ({
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

const setupStore = (room = makeRoom()) => {
  vi.mocked(useRoomMeasureStore).mockReturnValue({
    currentRoom: room,
    setSubstep: mockSetSubstep,
    shapeOrientation: 0,
  } as ReturnType<typeof useRoomMeasureStore>);
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('CornerLabelStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it('renders RECTANGLE fallback when currentRoom is null', () => {
    vi.mocked(useRoomMeasureStore).mockReturnValue({
      currentRoom: null,
      setSubstep: mockSetSubstep,
      shapeOrientation: 0,
    } as ReturnType<typeof useRoomMeasureStore>);
    render(<CornerLabelStep />);
    // Component renders with RECTANGLE fallback — shows corner A
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
  });

  it('renders 4 corners for RECTANGLE shape', () => {
    setupStore(makeRoom('RECTANGLE'));
    render(<CornerLabelStep />);
    // Corners render as single letters in spans
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('B').length).toBeGreaterThan(0);
    expect(screen.getAllByText('C').length).toBeGreaterThan(0);
    expect(screen.getAllByText('D').length).toBeGreaterThan(0);
    expect(screen.queryByText('E')).not.toBeInTheDocument();
  });

  it('renders 6 corners for L_SHAPE', () => {
    setupStore(makeRoom('L_SHAPE'));
    render(<CornerLabelStep />);
    expect(screen.getAllByText('F').length).toBeGreaterThan(0);
    expect(screen.queryByText('G')).not.toBeInTheDocument();
  });

  it('renders 8 corners for U_SHAPE', () => {
    setupStore(makeRoom('U_SHAPE'));
    render(<CornerLabelStep />);
    expect(screen.getAllByText('H').length).toBeGreaterThan(0);
  });

  it('renders 8 corners for T_SHAPE', () => {
    setupStore(makeRoom('T_SHAPE'));
    render(<CornerLabelStep />);
    expect(screen.getAllByText('H').length).toBeGreaterThan(0);
    expect(screen.queryByText('I')).not.toBeInTheDocument();
  });

  it('marks corner A as "левый нижний"', () => {
    render(<CornerLabelStep />);
    expect(screen.getAllByText(/левый нижний/i).length).toBeGreaterThan(0);
  });

  it('navigates to substep 2 on button click', () => {
    render(<CornerLabelStep />);
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(2);
  });

  it('shows heading 3.1', () => {
    render(<CornerLabelStep />);
    expect(screen.getByText(/3\.1/)).toBeInTheDocument();
  });
});
