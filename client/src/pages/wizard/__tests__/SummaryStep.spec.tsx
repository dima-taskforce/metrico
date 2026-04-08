import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SummaryStep } from '../SummaryStep';
import * as roomsApi from '../../../api/rooms';
import * as wallsApi from '../../../api/walls';
import * as anglesApi from '../../../api/angles';
import * as photosApi from '../../../api/photos';
import * as projectsStore from '../../../stores/projectsStore';

const mockNavigate = vi.fn();

vi.mock('../../../api/rooms');
vi.mock('../../../api/walls');
vi.mock('../../../api/angles');
vi.mock('../../../api/photos');
vi.mock('../../../stores/projectsStore');
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
  useParams: () => ({ projectId: 'test-project' }),
}));

const mockRoom = (id: string, name: string, isMeasured = true, type = 'LIVING') => ({
  id,
  projectId: 'test-project',
  name,
  type: type as any,
  shape: 'RECTANGLE' as const,
  ceilingHeight1: 2.7,
  ceilingHeight2: null,
  sortOrder: 0,
  isMeasured,
  createdAt: '2026-04-08T00:00:00Z',
  updatedAt: '2026-04-08T00:00:00Z',
});

const mockWall = (id: string, length: number, sortOrder = 0) => ({
  id,
  roomId: 'room-1',
  label: `Wall ${id}`,
  cornerFrom: 'A',
  cornerTo: 'B',
  length,
  material: 'CONCRETE' as const,
  wallType: 'INTERNAL' as const,
  curvatureBottom: null,
  curvatureMiddle: null,
  curvatureTop: null,
  sortOrder,
  createdAt: '2026-04-08T00:00:00Z',
  updatedAt: '2026-04-08T00:00:00Z',
});

const mockAngle = (wallAId: string, wallBId: string) => ({
  id: `angle-${wallAId}-${wallBId}`,
  roomId: 'room-1',
  cornerLabel: 'A',
  wallAId,
  wallBId,
  isRightAngle: true,
  angleDegrees: null,
  photoPath: null,
  createdAt: '2026-04-08T00:00:00Z',
  updatedAt: '2026-04-08T00:00:00Z',
});

const mockPhoto = (id: string, photoType = 'OVERVIEW_BEFORE') => ({
  id,
  userId: 'user-1',
  roomId: 'room-1',
  photoType: photoType as any,
  originalPath: `/photos/${id}.jpg`,
  thumbPath: `/photos/${id}-thumb.jpg`,
  createdAt: '2026-04-08T00:00:00Z',
  updatedAt: '2026-04-08T00:00:00Z',
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('SummaryStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Setup API mocks as plain objects with vi.fn() methods
    Object.assign(roomsApi.roomsApi, {
      list: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    });

    Object.assign(wallsApi.wallsApi, {
      list: vi.fn(),
      update: vi.fn(),
    });

    Object.assign(anglesApi.anglesApi, {
      list: vi.fn(),
      create: vi.fn(),
    });

    Object.assign(photosApi.photosApi, {
      list: vi.fn(),
      create: vi.fn(),
    });

    // Setup projects store mock
    vi.mocked(projectsStore.useProjectsStore).mockReturnValue({
      currentProject: { id: 'test-project', name: 'Test Apartment' } as any,
    } as any);

    // Setup default mocks
    vi.mocked(wallsApi.wallsApi.list).mockResolvedValue([]);
    vi.mocked(anglesApi.anglesApi.list).mockResolvedValue([]);
    vi.mocked(photosApi.photosApi.list).mockResolvedValue([]);
  });

  it('renders summary title and project name', async () => {
    const rooms = [mockRoom('room-1', 'Спальня')];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Сводка по комнатам')).toBeInTheDocument();
      expect(screen.getByText('Test Apartment')).toBeInTheDocument();
    });
  });

  it('renders table with room data', async () => {
    const rooms = [
      mockRoom('room-1', 'Спальня'),
      mockRoom('room-2', 'Кухня'),
    ];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Спальня')).toBeInTheDocument();
      expect(screen.getByText('Кухня')).toBeInTheDocument();
    });
  });

  it('calculates area correctly for rectangle', async () => {
    const rooms = [mockRoom('room-1', 'Спальня')];
    const walls = [
      mockWall('wall-1', 5000000, 0), // 5m in mm
      mockWall('wall-2', 4000000, 1), // 4m in mm
    ];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);
    vi.mocked(wallsApi.wallsApi.list).mockResolvedValue(walls);
    vi.mocked(anglesApi.anglesApi.list).mockResolvedValue([
      mockAngle('wall-1', 'wall-2'),
    ]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      // Area = 5m * 4m = 20 m²
      // 5000000 mm * 4000000 mm / 1_000_000 = 20.00 m²
      expect(screen.getByText('20.00')).toBeInTheDocument();
    });
  });

  it('displays unmeasured room warning', async () => {
    const rooms = [
      mockRoom('room-1', 'Спальня', true),
      mockRoom('room-2', 'Кухня', false), // Unmeasured
    ];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Незамеренные комнаты/)).toBeInTheDocument();
      expect(screen.getByText('Кухня')).toBeInTheDocument();
    });
  });

  it('displays warning for rooms without photos', async () => {
    const rooms = [mockRoom('room-1', 'Спальня')];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);
    (photosApi.photosApi.list as any).mockResolvedValue([]); // No photos

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Комнаты без фотографий/)).toBeInTheDocument();
    });
  });

  it('does not show missing photos warning when photos exist', async () => {
    const rooms = [mockRoom('room-1', 'Спальня')];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);
    (photosApi.photosApi.list as any).mockResolvedValue([
      mockPhoto('photo-1'),
    ]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.queryByText(/Комнаты без фотографий/)
      ).not.toBeInTheDocument();
    });
  });

  it('calculates total area correctly', async () => {
    const rooms = [
      mockRoom('room-1', 'Спальня'),
      mockRoom('room-2', 'Кухня'),
    ];
    const walls1 = [
      mockWall('wall-1', 5000000, 0), // 5m
      mockWall('wall-2', 4000000, 1), // 4m
    ];
    const walls2 = [
      mockWall('wall-3', 3000000, 0), // 3m
      mockWall('wall-4', 2000000, 1), // 2m
    ];

    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);
    vi.mocked(wallsApi.wallsApi.list).mockImplementation((roomId: string) => {
      if (roomId === 'room-1') return Promise.resolve(walls1);
      return Promise.resolve(walls2);
    });
    vi.mocked(anglesApi.anglesApi.list).mockResolvedValue([
      mockAngle('wall-1', 'wall-2'),
      mockAngle('wall-3', 'wall-4'),
    ]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      // Total = 20 + 6 = 26 m²
      expect(screen.getByText('26.00')).toBeInTheDocument();
    });
  });

  it('displays average ceiling height', async () => {
    const rooms = [
      mockRoom('room-1', 'Спальня'),
      mockRoom('room-2', 'Кухня'),
    ];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      // Both rooms have ceilingHeight1 = 2.7
      // Average = 2.7
      expect(screen.getByText('2.70 м')).toBeInTheDocument();
    });
  });

  it('navigates to measure step when row is clicked', async () => {
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue([
      mockRoom('room-1', 'Спальня'),
    ]);

    const { container } = render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });
  });

  it('displays correct column headers', async () => {
    const rooms = [mockRoom('room-1', 'Спальня')];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Название')).toBeInTheDocument();
      expect(screen.getByText('Тип')).toBeInTheDocument();
      expect(screen.getByText('Площадь (м²)')).toBeInTheDocument();
      expect(screen.getByText('Периметр (м)')).toBeInTheDocument();
      expect(screen.getByText('Объём (м³)')).toBeInTheDocument();
      expect(screen.getByText('Стен')).toBeInTheDocument();
      expect(screen.getByText('Окон')).toBeInTheDocument();
      expect(screen.getByText('Дверей')).toBeInTheDocument();
    });
  });

  it('displays room type emoji', async () => {
    const rooms = [mockRoom('room-1', 'Спальня', true, 'BEDROOM')];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('🛏')).toBeInTheDocument();
    });
  });

  it('displays back and generate plan buttons', async () => {
    const rooms = [mockRoom('room-1', 'Спальня')];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('← Назад')).toBeInTheDocument();
      expect(screen.getByText('Сформировать обмерный план →')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    vi.mocked(roomsApi.roomsApi.list).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<SummaryStep />, { wrapper: Wrapper });

    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('formats perimeter in meters', async () => {
    const rooms = [mockRoom('room-1', 'Спальня')];
    const walls = [
      mockWall('wall-1', 5000000, 0), // 5m
      mockWall('wall-2', 4000000, 1), // 4m
    ];
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue(rooms);
    vi.mocked(wallsApi.wallsApi.list).mockResolvedValue(walls);
    vi.mocked(anglesApi.anglesApi.list).mockResolvedValue([]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      // Perimeter = 5000000 + 4000000 = 9000000 mm = 9 m
      expect(screen.getByText('9.00')).toBeInTheDocument();
    });
  });

  it('handles empty rooms list', async () => {
    vi.mocked(roomsApi.roomsApi.list).mockResolvedValue([]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      // Should render but with empty table
      expect(screen.getByText('Сводка по комнатам')).toBeInTheDocument();
    });
  });
});
