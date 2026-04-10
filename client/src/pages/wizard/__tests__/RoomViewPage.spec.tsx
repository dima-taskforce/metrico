import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RoomViewPage } from '../RoomViewPage';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ projectId: 'p1', roomId: 'r1' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../api/rooms', () => ({
  roomsApi: { get: vi.fn() },
}));

vi.mock('../../../api/walls', () => ({
  wallsApi: { list: vi.fn() },
}));

vi.mock('../../../api/segments', () => ({
  segmentsApi: { list: vi.fn() },
}));

vi.mock('../../../api/openings', () => ({
  openingsApi: {
    windows: { list: vi.fn() },
    doors: { list: vi.fn() },
  },
}));

vi.mock('../../../api/elements', () => ({
  elementsApi: { list: vi.fn() },
}));

vi.mock('../../../api/photos', () => ({
  photosApi: { list: vi.fn() },
}));

import { roomsApi } from '../../../api/rooms';
import { wallsApi } from '../../../api/walls';
import { segmentsApi } from '../../../api/segments';
import { openingsApi } from '../../../api/openings';
import { elementsApi } from '../../../api/elements';
import { photosApi } from '../../../api/photos';

// ── Fixtures ──────────────────────────────────────────────────────────────

const makeRoom = (overrides = {}) => ({
  id: 'r1',
  projectId: 'p1',
  name: 'Гостиная',
  type: 'LIVING' as const,
  shape: 'RECTANGLE' as const,
  sortOrder: 0,
  isMeasured: true,
  ceilingHeight1: 2.7,
  ceilingHeight2: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeWall = (id = 'w1') => ({
  id,
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
});

const makeWindow = (id = 'win1') => ({
  id,
  wallId: 'w1',
  width: 1.2,
  height: 1.4,
  sillHeightFromScreed: 0.9,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const makeDoor = (id = 'd1') => ({
  id,
  wallId: 'w1',
  width: 0.9,
  heightFromScreed: 2.0,
  isFrenchDoor: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const makeElement = (id = 'el1') => ({
  id,
  roomId: 'r1',
  wallId: 'w1',
  elementType: 'RADIATOR' as const,
  width: 0.8,
  height: 0.6,
  description: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const makePhoto = (photoType = 'OVERVIEW_BEFORE' as const) => ({
  id: 'ph1',
  userId: 'u1',
  roomId: 'r1',
  photoType,
  originalPath: 'uploads/photos/u1/p1/r1/abc.jpg',
  thumbPath: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ── Setup helpers ─────────────────────────────────────────────────────────

function setupMocks({
  room = makeRoom(),
  walls = [makeWall()],
  segments = [] as ReturnType<typeof makeWindow>[],
  windows = [] as ReturnType<typeof makeWindow>[],
  doors = [] as ReturnType<typeof makeDoor>[],
  elements = [] as ReturnType<typeof makeElement>[],
  photos = [] as ReturnType<typeof makePhoto>[],
} = {}) {
  vi.mocked(roomsApi.get).mockResolvedValue(room as never);
  vi.mocked(wallsApi.list).mockResolvedValue(walls as never);
  vi.mocked(segmentsApi.list).mockResolvedValue(segments as never);
  vi.mocked(openingsApi.windows.list).mockResolvedValue(windows as never);
  vi.mocked(openingsApi.doors.list).mockResolvedValue(doors as never);
  vi.mocked(elementsApi.list).mockResolvedValue(elements as never);
  vi.mocked(photosApi.list).mockResolvedValue(photos as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('RoomViewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    setupMocks();
    render(<RoomViewPage />);
    expect(screen.getByText(/Загрузка/i)).toBeInTheDocument();
  });

  it('renders room name and type after loading', async () => {
    setupMocks();
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.getByText('Гостиная')).toBeInTheDocument();
      expect(screen.getByText(/Гостиная.*Прямоугольник/i)).toBeInTheDocument();
    });
  });

  it('shows "Замерена" badge', async () => {
    setupMocks();
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.getByText('Замерена')).toBeInTheDocument();
    });
  });

  it('renders ceiling height', async () => {
    setupMocks();
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Высота потолка/i)).toBeInTheDocument();
      expect(screen.getByText(/2\.70 м/i)).toBeInTheDocument();
    });
  });

  it('renders wall list', async () => {
    setupMocks({ walls: [makeWall()] });
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Стены \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText('A-B')).toBeInTheDocument();
    });
  });

  it('renders wall with windows', async () => {
    setupMocks({
      walls: [makeWall()],
      windows: [makeWindow()],
    });
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Окна \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/1\.20 м × 1\.40 м/i)).toBeInTheDocument();
    });
  });

  it('renders wall with doors', async () => {
    setupMocks({
      walls: [makeWall()],
      doors: [makeDoor()],
    });
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Двери \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/0\.90 м × 2\.00 м/i)).toBeInTheDocument();
    });
  });

  it('renders elements section', async () => {
    setupMocks({ elements: [makeElement()] });
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Элементы \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Радиатор/i)).toBeInTheDocument();
    });
  });

  it('renders photos section', async () => {
    setupMocks({ photos: [makePhoto()] });
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Фото \(1\)/i)).toBeInTheDocument();
    });
  });

  it('does not render walls section when no walls', async () => {
    setupMocks({ walls: [] });
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.queryByText(/Стены/i)).not.toBeInTheDocument();
    });
  });

  it('shows error message on load failure', async () => {
    vi.mocked(roomsApi.get).mockRejectedValue(new Error('Нет соединения'));
    vi.mocked(wallsApi.list).mockResolvedValue([] as never);
    vi.mocked(elementsApi.list).mockResolvedValue([] as never);
    vi.mocked(photosApi.list).mockResolvedValue([] as never);
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Нет соединения/i)).toBeInTheDocument();
    });
  });

  it('back button navigates to rooms list', async () => {
    setupMocks();
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.queryByText(/^Загрузка/i)).not.toBeInTheDocument();
    });
    screen.getByRole('button', { name: /← К списку комнат/i }).click();
    expect(mockNavigate).toHaveBeenCalledWith('/wizard/p1/rooms');
  });

  it('"Изменить замер" navigates to measure page', async () => {
    setupMocks();
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.queryByText(/^Загрузка/i)).not.toBeInTheDocument();
    });
    screen.getByRole('button', { name: /Изменить замер/i }).click();
    expect(mockNavigate).toHaveBeenCalledWith('/wizard/p1/rooms/r1/measure');
  });

  it('renders overview photo when present', async () => {
    setupMocks({ photos: [makePhoto('OVERVIEW_BEFORE')] });
    render(<RoomViewPage />);
    await waitFor(() => {
      expect(screen.getByAltText(/Общий вид комнаты/i)).toBeInTheDocument();
    });
  });
});
