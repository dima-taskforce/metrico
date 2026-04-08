import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PhotoChecklistStep } from '../PhotoChecklistStep';
import { useRoomMeasureStore } from '../../../../stores/roomMeasureStore';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ projectId: 'p1', roomId: 'r1' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../../stores/roomMeasureStore', () => ({
  useRoomMeasureStore: vi.fn(),
}));

vi.mock('../../../../api/photos', () => ({
  photosApi: {
    list: vi.fn(),
    upload: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../../../../api/rooms', () => ({
  roomsApi: { update: vi.fn() },
}));

import { photosApi } from '../../../../api/photos';
import { roomsApi } from '../../../../api/rooms';

const mockSetSubstep = vi.fn();

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

const makePhoto = (overrides = {}) => ({
  id: 'ph1',
  userId: 'u1',
  roomId: 'r1',
  photoType: 'OVERVIEW_BEFORE' as const,
  originalPath: 'uploads/photos/u1/p1/r1/abc.jpg',
  thumbPath: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const setupStore = (overrides: Record<string, unknown> = {}) => {
  vi.mocked(useRoomMeasureStore).mockReturnValue({
    walls: [],
    segments: {},
    windows: {},
    doors: {},
    elements: [],
    setSubstep: mockSetSubstep,
    ...overrides,
  } as ReturnType<typeof useRoomMeasureStore>);
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('PhotoChecklistStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(photosApi.list).mockResolvedValue([]);
    setupStore();
  });

  it('shows loading state while photos are being fetched', () => {
    render(<PhotoChecklistStep />);
    expect(screen.getByText(/Загрузка/i)).toBeInTheDocument();
  });

  it('shows empty photo placeholder after loading', async () => {
    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.getByText(/Фото не добавлено/i)).toBeInTheDocument();
    });
  });

  it('shows upload button', async () => {
    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Добавить фото/i })).toBeInTheDocument();
    });
  });

  it('renders checklist items', async () => {
    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.getByText(/Общее фото сделано/i)).toBeInTheDocument();
      expect(screen.getByText(/Стены добавлены/i)).toBeInTheDocument();
      expect(screen.getByText(/Кривизна стен проверена/i)).toBeInTheDocument();
      expect(screen.getByText(/Все элементы.*отмечены на развёртке/i)).toBeInTheDocument();
    });
  });

  it('shows required labels for mandatory checklist items', async () => {
    render(<PhotoChecklistStep />);
    await waitFor(() => {
      const requiredTags = screen.getAllByText(/обязательно/i);
      expect(requiredTags.length).toBeGreaterThan(0);
    });
  });

  it('"Готово с комнатой" is disabled when no photo and no manual checks', async () => {
    render(<PhotoChecklistStep />);
    await waitFor(() => {
      const doneBtn = screen.getByRole('button', { name: /Готово с комнатой/i });
      expect(doneBtn).toBeDisabled();
    });
  });

  it('photo appears in checklist when OVERVIEW_BEFORE photo loaded', async () => {
    vi.mocked(photosApi.list).mockResolvedValue([makePhoto()]);
    render(<PhotoChecklistStep />);
    await waitFor(() => {
      // hasPhoto = true → "Общее фото сделано" check is green (checked state indicated via circle)
      const photoItem = screen.getByText(/Общее фото сделано/i);
      expect(photoItem).toBeInTheDocument();
    });
  });

  it('displays uploaded photo thumbnail', async () => {
    vi.mocked(photosApi.list).mockResolvedValue([makePhoto()]);
    render(<PhotoChecklistStep />);
    await waitFor(() => {
      const img = screen.getByRole('img', { name: /общий вид/i });
      expect(img).toBeInTheDocument();
    });
  });

  it('uploads a photo and adds it to the list', async () => {
    const uploaded = makePhoto({ id: 'ph-new' });
    vi.mocked(photosApi.upload).mockResolvedValue(uploaded);

    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.queryByText(/Загрузка/i)).not.toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'room.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(photosApi.upload).toHaveBeenCalledWith('r1', file, 'OVERVIEW_BEFORE');
    });
  });

  it('shows upload error when upload fails', async () => {
    vi.mocked(photosApi.upload).mockRejectedValue(new Error('Ошибка загрузки'));

    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.queryByText(/Загрузка/i)).not.toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'room.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Ошибка загрузки/i)).toBeInTheDocument();
    });
  });

  it('removes photo when ✕ clicked on photo', async () => {
    vi.mocked(photosApi.list).mockResolvedValue([makePhoto()]);
    vi.mocked(photosApi.remove).mockResolvedValue(undefined as never);

    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.getByRole('img', { name: /общий вид/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Удалить фото/i }));

    await waitFor(() => {
      expect(photosApi.remove).toHaveBeenCalledWith('ph1');
    });
  });

  it('enables "Готово с комнатой" when all required conditions met', async () => {
    vi.mocked(photosApi.list).mockResolvedValue([makePhoto()]);
    setupStore({ walls: [makeWall()], segments: {}, windows: {}, doors: {}, elements: [] });

    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.queryByText(/Загрузка/i)).not.toBeInTheDocument();
    });

    // Check manual checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((cb) => fireEvent.click(cb));

    await waitFor(() => {
      const doneBtn = screen.getByRole('button', { name: /Готово с комнатой/i });
      expect(doneBtn).not.toBeDisabled();
    });
  });

  it('marks room as measured and navigates on "Готово"', async () => {
    vi.mocked(photosApi.list).mockResolvedValue([makePhoto()]);
    vi.mocked(roomsApi.update).mockResolvedValue({} as never);
    setupStore({ walls: [makeWall()], segments: {}, windows: {}, doors: {}, elements: [] });

    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.queryByText(/Загрузка/i)).not.toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((cb) => fireEvent.click(cb));

    const doneBtn = screen.getByRole('button', { name: /Готово с комнатой/i });
    await waitFor(() => expect(doneBtn).not.toBeDisabled());
    fireEvent.click(doneBtn);

    await waitFor(() => {
      expect(roomsApi.update).toHaveBeenCalledWith('p1', 'r1', { isMeasured: true });
    });
  });

  it('shows navigation back button', async () => {
    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /назад/i })).toBeInTheDocument();
    });
  });

  it('navigates back to substep 6 on back click', async () => {
    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.queryByText(/^Загрузка…$/i)).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /назад/i }));
    expect(mockSetSubstep).toHaveBeenCalledWith(6);
  });

  it('shows walls count in checklist', async () => {
    setupStore({ walls: [makeWall(), makeWall('w2')], segments: {}, windows: {}, doors: {}, elements: [] });
    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.getByText(/Стены добавлены \(2 шт\.\)/i)).toBeInTheDocument();
    });
  });

  it('shows elements count in checklist', async () => {
    const el = { id: 'el1', roomId: 'r1', wallId: 'w1', elementType: 'RADIATOR' as const };
    setupStore({ walls: [], segments: {}, windows: {}, doors: {}, elements: [el] });
    render(<PhotoChecklistStep />);
    await waitFor(() => {
      expect(screen.getByText(/Элементы отмечены \(1 шт\.\)/i)).toBeInTheDocument();
    });
  });
});
