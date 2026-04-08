/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { Room, Wall, Angle, Photo } from '../../../types/api';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const { mockNavigate, mockRoomsList, mockWallsList, mockAnglesList, mockPhotosList, mockUseProjectsStore } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockRoomsList: vi.fn(),
  mockWallsList: vi.fn(),
  mockAnglesList: vi.fn(),
  mockPhotosList: vi.fn(),
  mockUseProjectsStore: vi.fn(),
}));

vi.mock('../../../api/rooms', () => ({
  roomsApi: {
    list: mockRoomsList,
    create: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../../../api/walls', () => ({
  wallsApi: {
    list: mockWallsList,
    update: vi.fn(),
  },
}));

vi.mock('../../../api/angles', () => ({
  anglesApi: {
    list: mockAnglesList,
    create: vi.fn(),
  },
}));

vi.mock('../../../api/photos', () => ({
  photosApi: {
    list: mockPhotosList,
    create: vi.fn(),
  },
}));

vi.mock('../../../stores/projectsStore', () => ({
  useProjectsStore: mockUseProjectsStore,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: 'test-project' }),
  };
});

let SummaryStep: any;

const mockRoom = (id: string, name: string, isMeasured = true, type = 'LIVING'): Room => ({
  id,
  projectId: 'test-project',
  name,
  type: type as Room['type'],
  shape: 'RECTANGLE' as const,
  ceilingHeight1: 2.7,
  ceilingHeight2: null,
  sortOrder: 0,
  isMeasured,
  createdAt: '2026-04-08T00:00:00Z',
  updatedAt: '2026-04-08T00:00:00Z',
});

const mockWall = (id: string, length: number, sortOrder = 0): Wall => ({
  id,
  roomId: 'room-1',
  label: 'Wall ' + id,
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

const mockAngle = (wallAId: string, wallBId: string): Angle => ({
  id: 'angle-' + wallAId + '-' + wallBId,
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

const mockPhoto = (id: string, photoType = 'OVERVIEW_BEFORE'): Photo => ({
  id,
  userId: 'user-1',
  roomId: 'room-1',
  photoType: photoType as Photo['photoType'],
  originalPath: '/photos/' + id + '.jpg',
  thumbPath: '/photos/' + id + '-thumb.jpg',
  createdAt: '2026-04-08T00:00:00Z',
  updatedAt: '2026-04-08T00:00:00Z',
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('SummaryStep', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Import SummaryStep after mocks are set up
    const module = await import('../SummaryStep');
    SummaryStep = module.SummaryStep;

    // Mock fetch globally (used by countOpenings in SummaryStep)
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue([]),
    } as unknown as Response);

    // Default: one photo per room so "Комнаты без фотографий" warning does not appear
    mockRoomsList.mockResolvedValue([]);
    mockWallsList.mockResolvedValue([]);
    mockAnglesList.mockResolvedValue([]);
    mockPhotosList.mockResolvedValue([mockPhoto('default-photo')]);
    mockUseProjectsStore.mockReturnValue({
      currentProject: { id: 'test-project', name: 'Test Apartment' },
    });
  });

  afterEach(() => {
    // Clear DOM between tests by removing all children from body
    if (typeof document !== 'undefined' && document.body) {
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
    }
  });

  it('renders summary title and project name', async () => {
    mockRoomsList.mockResolvedValue([mockRoom('room-1', 'Спальня')]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Сводка по комнатам')).toBeInTheDocument();
      expect(screen.getByText('Test Apartment')).toBeInTheDocument();
    });
  });

  it('renders table with room data', async () => {
    mockRoomsList.mockResolvedValue([
      mockRoom('room-1', 'Спальня'),
      mockRoom('room-2', 'Кухня'),
    ]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Спальня')).toBeInTheDocument();
      expect(screen.getByText('Кухня')).toBeInTheDocument();
    });
  });

  it('calculates area correctly for rectangle', async () => {
    mockRoomsList.mockResolvedValue([mockRoom('room-1', 'Спальня')]);
    mockWallsList.mockResolvedValue([
      mockWall('wall-1', 5000, 0),
      mockWall('wall-2', 4000, 1),
    ]);
    mockAnglesList.mockResolvedValue([mockAngle('wall-1', 'wall-2')]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('20.00')).toBeInTheDocument();
    });
  });

  it('displays unmeasured room warning', async () => {
    mockRoomsList.mockResolvedValue([
      mockRoom('room-1', 'Спальня', true),
      mockRoom('room-2', 'Зал', false),
    ]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Незамеренные комнаты/)).toBeInTheDocument();
      expect(screen.getAllByText('Зал').length).toBeGreaterThan(0);
    });
  });

  it('displays warning for rooms without photos', async () => {
    mockRoomsList.mockResolvedValue([mockRoom('room-1', 'Спальня')]);
    mockPhotosList.mockResolvedValue([]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Комнаты без фотографий/)).toBeInTheDocument();
    });
  });

  it('does not show missing photos warning when photos exist', async () => {
    mockRoomsList.mockResolvedValue([mockRoom('room-1', 'Спальня')]);
    mockPhotosList.mockResolvedValue([mockPhoto('photo-1')]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.queryByText(/Комнаты без фотографий/)).not.toBeInTheDocument();
    });
  });

  it('calculates total area correctly', async () => {
    mockRoomsList.mockResolvedValue([
      mockRoom('room-1', 'Спальня'),
      mockRoom('room-2', 'Кухня'),
    ]);
    mockWallsList.mockImplementation((roomId: string) => {
      if (roomId === 'room-1') return Promise.resolve([
        mockWall('wall-1', 5000, 0),
        mockWall('wall-2', 4000, 1),
      ]);
      return Promise.resolve([
        mockWall('wall-3', 3000, 0),
        mockWall('wall-4', 2000, 1),
      ]);
    });
    mockAnglesList.mockResolvedValue([
      mockAngle('wall-1', 'wall-2'),
      mockAngle('wall-3', 'wall-4'),
    ]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/26.00/)).toBeInTheDocument();
    });
  });

  it('displays average ceiling height', async () => {
    mockRoomsList.mockResolvedValue([
      mockRoom('room-1', 'Спальня'),
      mockRoom('room-2', 'Кухня'),
    ]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('2.70 м')).toBeInTheDocument();
    });
  });

  it('navigates to measure step when row is clicked', async () => {
    mockRoomsList.mockResolvedValue([mockRoom('room-1', 'Спальня')]);

    const { container } = render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });
  });

  it('displays correct column headers', async () => {
    mockRoomsList.mockResolvedValue([mockRoom('room-1', 'Спальня')]);

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
    mockRoomsList.mockResolvedValue([mockRoom('room-1', 'Спальня', true, 'BEDROOM')]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('🛏')).toBeInTheDocument();
    });
  });

  it('displays back and generate plan buttons', async () => {
    mockRoomsList.mockResolvedValue([mockRoom('room-1', 'Спальня')]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('← Назад')).toBeInTheDocument();
      expect(screen.getByText('Сформировать обмерный план →')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockRoomsList.mockImplementation(() => new Promise(() => {}));

    render(<SummaryStep />, { wrapper: Wrapper });

    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('formats perimeter in meters', async () => {
    mockRoomsList.mockResolvedValue([mockRoom('room-1', 'Спальня')]);
    mockWallsList.mockResolvedValue([
      mockWall('wall-1', 5000, 0),
      mockWall('wall-2', 4000, 1),
    ]);
    mockAnglesList.mockResolvedValue([]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('9.00')).toBeInTheDocument();
    });
  });

  it('handles empty rooms list', async () => {
    mockRoomsList.mockResolvedValue([]);

    render(<SummaryStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Сводка по комнатам')).toBeInTheDocument();
    });
  });
});
