import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CeilingHeightStep } from '../CeilingHeightStep';
import { useRoomMeasureStore } from '../../../../stores/roomMeasureStore';

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({ useParams: () => ({ projectId: 'p1' }) }));

const mockSetCurrentRoom = vi.fn();
const mockSetSubstep = vi.fn();

vi.mock('../../../../stores/roomMeasureStore', () => ({
  useRoomMeasureStore: vi.fn(),
}));

vi.mock('../../../../api/rooms', () => ({
  roomsApi: {
    update: vi.fn(),
  },
}));

import { roomsApi } from '../../../../api/rooms';

const makeRoom = (overrides = {}) => ({
  id: 'r1',
  projectId: 'p1',
  name: 'Кухня',
  type: 'KITCHEN' as const,
  shape: 'RECTANGLE' as const,
  ceilingHeight1: null,
  ceilingHeight2: null,
  sortOrder: 0,
  isMeasured: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const setupStore = (room = makeRoom()) => {
  vi.mocked(useRoomMeasureStore).mockReturnValue({
    currentRoom: room,
    setCurrentRoom: mockSetCurrentRoom,
    setSubstep: mockSetSubstep,
  } as ReturnType<typeof useRoomMeasureStore>);
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('CeilingHeightStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it('renders both height inputs', () => {
    render(<CeilingHeightStep />);
    expect(screen.getByLabelText(/H1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/H2/i)).toBeInTheDocument();
  });

  it('shows navigation buttons', () => {
    render(<CeilingHeightStep />);
    expect(screen.getByRole('button', { name: /назад/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /стены/i })).toBeInTheDocument();
  });

  it('navigates back to substep 1 on back button click', () => {
    render(<CeilingHeightStep />);
    fireEvent.click(screen.getByRole('button', { name: /назад/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(1);
  });

  it('shows validation error for H1 below minimum', async () => {
    render(<CeilingHeightStep />);
    const h1 = screen.getByLabelText(/H1/i);
    fireEvent.change(h1, { target: { value: '1.0' } });
    fireEvent.click(screen.getByRole('button', { name: /стены/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/минимум 1.5/i)[0]).toBeInTheDocument();
    });
  });

  it('shows validation error for H1 above maximum', async () => {
    render(<CeilingHeightStep />);
    const h1 = screen.getByLabelText(/H1/i);
    fireEvent.change(h1, { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: /стены/i }));

    await waitFor(() => {
      expect(screen.getByText(/максимум 10/i)).toBeInTheDocument();
    });
  });

  it('shows slope warning when H1 and H2 differ by more than 10mm', async () => {
    render(<CeilingHeightStep />);
    fireEvent.change(screen.getByLabelText(/H1/i), { target: { value: '2.68' } });
    fireEvent.change(screen.getByLabelText(/H2/i), { target: { value: '2.63' } });

    await waitFor(() => {
      expect(screen.getByText(/50\s*мм/i)).toBeInTheDocument();
    });
  });

  it('does not show warning when heights differ by ≤10mm', async () => {
    render(<CeilingHeightStep />);
    fireEvent.change(screen.getByLabelText(/H1/i), { target: { value: '2.68' } });
    fireEvent.change(screen.getByLabelText(/H2/i), { target: { value: '2.679' } });

    await waitFor(() => {
      expect(screen.queryByText(/наклонён/i)).not.toBeInTheDocument();
    });
  });

  it('submits valid form and advances to substep 3', async () => {
    const updatedRoom = makeRoom({ ceilingHeight1: 2.68 });
    vi.mocked(roomsApi.update).mockResolvedValue(updatedRoom);

    render(<CeilingHeightStep />);
    fireEvent.change(screen.getByLabelText(/H1/i), { target: { value: '2.68' } });
    fireEvent.click(screen.getByRole('button', { name: /стены/i }));

    await waitFor(() => {
      expect(roomsApi.update).toHaveBeenCalledWith('p1', 'r1', expect.objectContaining({ ceilingHeight1: 2.68 }));
      expect(mockSetCurrentRoom).toHaveBeenCalledWith(updatedRoom);
      expect(mockSetSubstep).toHaveBeenCalledWith(3);
    });
  });

  it('shows error message when API call fails', async () => {
    vi.mocked(roomsApi.update).mockRejectedValue(new Error('Сетевая ошибка'));

    render(<CeilingHeightStep />);
    fireEvent.change(screen.getByLabelText(/H1/i), { target: { value: '2.68' } });
    fireEvent.click(screen.getByRole('button', { name: /стены/i }));

    await waitFor(() => {
      expect(screen.getByText(/сетевая ошибка/i)).toBeInTheDocument();
    });
  });

  it('pre-fills values from existing room data', () => {
    setupStore(makeRoom({ ceilingHeight1: 2.68, ceilingHeight2: 2.65 }));
    render(<CeilingHeightStep />);

    expect(screen.getByLabelText(/H1/i)).toHaveValue(2.68);
    expect(screen.getByLabelText(/H2/i)).toHaveValue(2.65);
  });
});
