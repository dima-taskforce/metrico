import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CornerLabelStep } from '../CornerLabelStep';
import { useRoomMeasureStore } from '../../../../stores/roomMeasureStore';

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../../../../stores/roomMeasureStore', () => ({
  useRoomMeasureStore: vi.fn(),
}));

const mockSetSubstep = vi.fn();

const makeRoom = (shape: 'RECTANGLE' | 'L_SHAPE' | 'U_SHAPE' | 'CUSTOM' = 'RECTANGLE') => ({
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
  } as ReturnType<typeof useRoomMeasureStore>);
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('CornerLabelStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it('renders nothing when currentRoom is null', () => {
    vi.mocked(useRoomMeasureStore).mockReturnValue({
      currentRoom: null,
      setSubstep: mockSetSubstep,
    } as ReturnType<typeof useRoomMeasureStore>);
    const { container } = render(<CornerLabelStep />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders 4 corners for RECTANGLE shape', () => {
    setupStore(makeRoom('RECTANGLE'));
    render(<CornerLabelStep />);
    expect(screen.getByText(/Угол A/)).toBeInTheDocument();
    expect(screen.getByText(/Угол B/)).toBeInTheDocument();
    expect(screen.getByText(/Угол C/)).toBeInTheDocument();
    expect(screen.getByText(/Угол D/)).toBeInTheDocument();
    expect(screen.queryByText(/Угол E/)).not.toBeInTheDocument();
  });

  it('renders 6 corners for L_SHAPE', () => {
    setupStore(makeRoom('L_SHAPE'));
    render(<CornerLabelStep />);
    expect(screen.getByText(/Угол F/)).toBeInTheDocument();
    expect(screen.queryByText(/Угол G/)).not.toBeInTheDocument();
  });

  it('renders 8 corners for U_SHAPE', () => {
    setupStore(makeRoom('U_SHAPE'));
    render(<CornerLabelStep />);
    expect(screen.getByText(/Угол H/)).toBeInTheDocument();
  });

  it('marks corner A as "левый нижний"', () => {
    render(<CornerLabelStep />);
    expect(screen.getAllByText(/левый нижний/i).length).toBeGreaterThan(0);
  });

  it('navigates to substep 2 on button click', () => {
    render(<CornerLabelStep />);
    fireEvent.click(screen.getByRole('button', { name: /высота потолка/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(2);
  });

  it('shows heading 3.1', () => {
    render(<CornerLabelStep />);
    expect(screen.getByText(/3\.1/)).toBeInTheDocument();
  });
});
