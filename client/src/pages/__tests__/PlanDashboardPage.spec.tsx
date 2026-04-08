import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

const { mockGetFloorPlan, mockProjectsGet, mockProjectsReopen } = vi.hoisted(() => ({
  mockGetFloorPlan: vi.fn(),
  mockProjectsGet: vi.fn(),
  mockProjectsReopen: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'proj-1' }),
  };
});

vi.mock('../../api/plan', () => ({
  planApi: { getFloorPlan: mockGetFloorPlan, downloadPdf: vi.fn() },
}));

vi.mock('../../api/projects', () => ({
  projectsApi: {
    get: mockProjectsGet,
    reopen: mockProjectsReopen,
  },
}));

vi.mock('../../components/plan/PlanCanvas', () => ({
  PlanCanvas: () => <div data-testid="plan-canvas" />,
}));

vi.mock('../../components/dashboard/PlanTotals', () => ({
  PlanTotals: () => <div data-testid="plan-totals" />,
}));

vi.mock('../../components/dashboard/RoomDetailsSidebar', () => ({
  RoomDetailsSidebar: () => <div data-testid="room-sidebar" />,
}));

import { PlanDashboardPage } from '../PlanDashboardPage';

const mockPlanData = {
  projectId: 'proj-1',
  projectLabel: 'Тест',
  generatedAt: new Date('2026-04-09'),
  rooms: [],
  adjacencies: [],
};

function renderPage() {
  return render(
    <BrowserRouter>
      <PlanDashboardPage />
    </BrowserRouter>,
  );
}

describe('PlanDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFloorPlan.mockResolvedValue(mockPlanData);
  });

  it('shows "Редактировать" button for COMPLETED project', async () => {
    mockProjectsGet.mockResolvedValue({ id: 'proj-1', status: 'COMPLETED' });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Редактировать')).toBeInTheDocument();
    });
  });

  it('does NOT show "Редактировать" button for DRAFT project', async () => {
    mockProjectsGet.mockResolvedValue({ id: 'proj-1', status: 'DRAFT' });

    renderPage();

    await waitFor(() => {
      expect(screen.queryByText('Редактировать')).not.toBeInTheDocument();
    });
  });

  it('calls reopen and navigates to wizard on button click', async () => {
    mockProjectsGet.mockResolvedValue({ id: 'proj-1', status: 'COMPLETED' });
    mockProjectsReopen.mockResolvedValue({ id: 'proj-1', status: 'DRAFT' });

    renderPage();

    const btn = await screen.findByText('Редактировать');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockProjectsReopen).toHaveBeenCalledWith('proj-1');
      expect(mockNavigate).toHaveBeenCalledWith('/wizard/proj-1/plan');
    });
  });

  it('shows "Скачать PDF" button', async () => {
    mockProjectsGet.mockResolvedValue({ id: 'proj-1', status: 'COMPLETED' });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Скачать PDF')).toBeInTheDocument();
    });
  });
});
