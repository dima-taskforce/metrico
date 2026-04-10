import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { PlanStep } from '../PlanStep';
import * as planApi from '../../../api/plan';
import * as projectsStore from '../../../stores/projectsStore';
import * as planStore from '../../../stores/planStore';
import type { FloorPlanRoom } from '../../../types/api';

const mockNavigateFn = vi.fn();

vi.mock('../../../api/plan');
vi.mock('../../../stores/projectsStore');
vi.mock('../../../stores/planStore');
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigateFn,
  useParams: () => ({ projectId: 'test-project' }),
}));
vi.mock('../../../components/plan/PlanCanvas', () => ({
  PlanCanvas: () => <div data-testid="plan-canvas">Canvas</div>,
}));

const mockRoom = (id: string, label: string): FloorPlanRoom => ({
  id,
  label,
  perimeter: 1000,
  area: 5000,
  volume: 2700,
  ceilingHeight: 2.7,
  curvatureMean: 0,
  curvatureStdDev: 0,
  walls: [
    { id: `${id}-w1`, roomId: id, label: `${label}-W1`, length: 250, material: 'CONCRETE', wallType: 'INTERNAL', sortOrder: 0, segments: [], openings: [] },
    { id: `${id}-w2`, roomId: id, label: `${label}-W2`, length: 200, material: 'CONCRETE', wallType: 'INTERNAL', sortOrder: 1, segments: [], openings: [] },
  ],
  elements: [],
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('PlanStep', () => {
  let usePlanStoreValue: any;
  let useProjectsStoreValue: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigateFn.mockClear();

    const rooms = [
      mockRoom('room-1', 'Living Room'),
      mockRoom('room-2', 'Kitchen'),
    ];

    usePlanStoreValue = {
      rooms,
      adjacencies: [],
      selectedRoomId: null,
      roomPositions: {
        'room-1': { x: 0, y: 0, rotation: 0 },
        'room-2': { x: 300, y: 0, rotation: 0 },
      },
      roomPolygons: {},
      assemblyErrors: [],
      scale: 1,
      status: 'done' as const,
      error: null,
      setPlanData: vi.fn(),
      setSelectedRoomId: vi.fn(),
      updateRoomPosition: vi.fn(),
      setScale: vi.fn(),
      setStatus: vi.fn(),
      setError: vi.fn(),
      addAdjacency: vi.fn(),
      removeAdjacency: vi.fn(),
    };

    useProjectsStoreValue = {
      currentProject: { id: 'test-project', name: 'Test Apartment' },
    };

    vi.mocked(planStore.usePlanStore).mockReturnValue(usePlanStoreValue as any);
    vi.mocked(projectsStore.useProjectsStore).mockReturnValue(useProjectsStoreValue as any);
  });

  it('renders plan step title and description', async () => {
    vi.mocked(planApi.planApi.getFloorPlan).mockResolvedValue({
      projectId: 'test-project',
      projectLabel: 'Test Project',
      rooms: [],
      adjacencies: [],
      generatedAt: new Date(),
    });

    render(<PlanStep />, { wrapper: Wrapper });

    expect(screen.getByText('Сборка плана')).toBeInTheDocument();
    expect(screen.getByText(/Создайте связи между комнатами/i)).toBeInTheDocument();
  });

  it('loads floor plan on mount', async () => {
    vi.mocked(planApi.planApi.getFloorPlan).mockResolvedValue({
      projectId: 'test-project',
      projectLabel: 'Test Project',
      rooms: usePlanStoreValue.rooms,
      adjacencies: [],
      generatedAt: new Date(),
    });

    render(<PlanStep />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(planApi.planApi.getFloorPlan).toHaveBeenCalledWith('test-project');
    });
  });

  it('displays error when plan loading fails', async () => {
    usePlanStoreValue.status = 'error';
    usePlanStoreValue.error = 'Ошибка загрузки плана';

    render(<PlanStep />, { wrapper: Wrapper });

    expect(screen.getByText('Ошибка при загрузке плана')).toBeInTheDocument();
    expect(screen.getByText('Ошибка загрузки плана')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    usePlanStoreValue.status = 'loading';

    render(<PlanStep />, { wrapper: Wrapper });

    expect(screen.getByText('Загрузка плана…')).toBeInTheDocument();
  });

  it('renders plan canvas when data loaded', () => {
    vi.mocked(planApi.planApi.getFloorPlan).mockResolvedValue({
      projectId: 'test-project',
      projectLabel: 'Test Project',
      rooms: usePlanStoreValue.rooms,
      adjacencies: [],
      generatedAt: new Date(),
    });

    render(<PlanStep />, { wrapper: Wrapper });

    expect(screen.getByTestId('plan-canvas')).toBeInTheDocument();
  });

  it('renders rotation button for selected room', () => {
    usePlanStoreValue.selectedRoomId = 'room-1';

    render(<PlanStep />, { wrapper: Wrapper });

    expect(screen.getByRole('button', { name: /Повернуть на 90/i })).toBeInTheDocument();
  });

  it('hides rotation button when no room selected', () => {
    usePlanStoreValue.selectedRoomId = null;

    render(<PlanStep />, { wrapper: Wrapper });

    expect(screen.queryByRole('button', { name: /Повернуть на 90/i })).not.toBeInTheDocument();
  });

  it('navigates to back step', async () => {
    const user = userEvent.setup();
    render(<PlanStep />, { wrapper: Wrapper });

    const backButton = screen.getByRole('button', { name: /Назад/i });
    await user.click(backButton);

    expect(mockNavigateFn).toHaveBeenCalledWith('/wizard/test-project/rooms');
  });

  it('saves layout and navigates on next', async () => {
    const user = userEvent.setup();
    vi.mocked(planApi.planApi.saveFloorPlanLayout).mockResolvedValue({ id: 'test-project', projectId: 'test-project' });

    render(<PlanStep />, { wrapper: Wrapper });

    const nextButton = screen.getByRole('button', { name: /Далее/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(planApi.planApi.saveFloorPlanLayout).toHaveBeenCalled();
      expect(mockNavigateFn).toHaveBeenCalledWith('/wizard/test-project/summary');
    });
  });

  it('disables next button while assembling', () => {
    usePlanStoreValue.status = 'assembling';

    render(<PlanStep />, { wrapper: Wrapper });

    const nextButton = screen.getByRole('button', { name: /Далее|Сохранение/i });
    expect(nextButton).toBeDisabled();
  });

  it('shows assembling state message', () => {
    usePlanStoreValue.status = 'assembling';

    render(<PlanStep />, { wrapper: Wrapper });

    const nextButton = screen.getByRole('button', { name: /Сохранение/i });
    expect(nextButton).toBeInTheDocument();
  });

  it('shows assembly errors when present', () => {
    usePlanStoreValue.assemblyErrors = [
      { roomId: 'room-1', message: 'Невозможно разместить комнату' },
    ];

    render(<PlanStep />, { wrapper: Wrapper });

    expect(screen.getByText('Ошибки геометрической сборки:')).toBeInTheDocument();
    expect(screen.getByText(/Невозможно разместить комнату/)).toBeInTheDocument();
  });
});
