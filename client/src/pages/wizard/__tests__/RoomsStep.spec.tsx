import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { RoomsStep } from '../RoomsStep';
import * as roomsApi from '../../../api/rooms';
import * as projectsStore from '../../../stores/projectsStore';

vi.mock('../../../api/rooms');
vi.mock('../../../stores/projectsStore');
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => vi.fn(),
  useParams: () => ({ projectId: 'test-project' }),
}));

const mockRoom = (id: string, type: string = 'LIVING', isMeasured = false) => ({
  id,
  projectId: 'test-project',
  name: `Room ${id}`,
  type: type as any,
  shape: 'RECTANGLE' as const,
  ceilingHeight1: null,
  ceilingHeight2: null,
  sortOrder: 0,
  isMeasured,
  createdAt: '2026-04-08T00:00:00Z',
  updatedAt: '2026-04-08T00:00:00Z',
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('RoomsStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectsStore.useProjectsStore).mockReturnValue({
      currentProject: { id: 'test-project', name: 'Test Apartment' } as any,
    } as any);
  });

  it('renders room list', async () => {
    const rooms = [mockRoom('1'), mockRoom('2')];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<RoomsStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Room 1')).toBeInTheDocument();
      expect(screen.getByText('Room 2')).toBeInTheDocument();
    });
  });

  it('displays room status correctly', async () => {
    const rooms = [mockRoom('1', 'LIVING', false), mockRoom('2', 'LIVING', true)];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<RoomsStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Не замерена')).toBeInTheDocument();
      expect(screen.getByText('Замерена')).toBeInTheDocument();
    });
  });

  it('shows hint when missing CORRIDOR', async () => {
    const rooms = [mockRoom('1', 'LIVING'), mockRoom('2', 'KITCHEN')];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<RoomsStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByText(/Не забудьте про коридор, балкон и кладовую/)
      ).toBeInTheDocument();
    });
  });

  it('does not show hint when all room types present', async () => {
    const rooms = [
      mockRoom('1', 'LIVING'),
      mockRoom('2', 'KITCHEN'),
      mockRoom('3', 'CORRIDOR'),
      mockRoom('4', 'BALCONY'),
      mockRoom('5', 'STORAGE'),
    ];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<RoomsStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.queryByText(/Не забудьте про коридор, балкон и кладовую/)
      ).not.toBeInTheDocument();
    });
  });

  it('renders room type icons', async () => {
    const rooms = [mockRoom('1', 'KITCHEN'), mockRoom('2', 'BEDROOM')];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<RoomsStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByLabelText('icon-KITCHEN')).toBeInTheDocument();
      expect(screen.getByLabelText('icon-BEDROOM')).toBeInTheDocument();
    });
  });

  it('shows add button', async () => {
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue([]);

    render(<RoomsStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('+ Добавить комнату')).toBeInTheDocument();
    });
  });

  it('displays empty state', async () => {
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue([]);

    render(<RoomsStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Нет комнат')).toBeInTheDocument();
    });
  });

  it('handles delete room', async () => {
    const rooms = [mockRoom('1')];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);
    vi.mocked(roomsApi.roomsApi.remove).mockResolvedValue(undefined as any);

    render(<RoomsStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Room 1')).toBeInTheDocument();
    });

    // Click delete — opens confirm dialog
    const deleteBtn = screen.getByLabelText('Удалить');
    await userEvent.click(deleteBtn);

    // Confirm dialog should appear; click the confirm button inside the dialog
    const dialog = await screen.findByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /^Удалить$/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(roomsApi.roomsApi.remove).toHaveBeenCalled();
    });
  });
});
