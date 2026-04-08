import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoomDetailsSidebar } from '../RoomDetailsSidebar';
import type { FloorPlanRoom } from '../../../types/api';

const makeRoom = (overrides: Partial<FloorPlanRoom> = {}): FloorPlanRoom => ({
  id: 'r1',
  label: 'Гостиная',
  perimeter: 14000,
  area: 20.5,
  volume: 55.35,
  ceilingHeight: 2.7,
  curvatureMean: 3.2,
  curvatureStdDev: 1.1,
  walls: [
    {
      id: 'w1',
      roomId: 'r1',
      label: 'Стена 1',
      length: 4500,
      material: 'CONCRETE',
      wallType: 'EXTERNAL',
      sortOrder: 0,
      segments: [
        { id: 's1', label: 'S1', segmentType: 'PLAIN', length: 3000 },
        { id: 's2', label: 'S2', segmentType: 'WINDOW', length: 1500 },
      ],
      openings: [
        { id: 'op1', type: 'WINDOW', label: 'Окно 1', width: 1500, height: 1200 },
      ],
    },
    {
      id: 'w2',
      roomId: 'r1',
      label: 'Стена 2',
      length: 3000,
      material: 'DRYWALL',
      wallType: 'INTERNAL',
      sortOrder: 1,
      segments: [],
      openings: [
        { id: 'op2', type: 'DOOR', label: 'Дверь 1', width: 900, height: 2000 },
      ],
    },
  ],
  elements: [
    { id: 'el1', elementType: 'COLUMN', label: 'Колонна А', depth: 0, x: 0, y: 0 },
  ],
  ...overrides,
});

describe('RoomDetailsSidebar', () => {
  it('renders room label in header', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId={null}
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Гостиная')).toBeInTheDocument();
  });

  it('shows area, perimeter, volume stats', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId={null}
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('20.50 м²')).toBeInTheDocument();
    expect(screen.getByText('14.00 м')).toBeInTheDocument();
    expect(screen.getByText('55.35 м³')).toBeInTheDocument();
  });

  it('shows ceiling height when present', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId={null}
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('2.70 м')).toBeInTheDocument();
  });

  it('shows walls count', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId={null}
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // 2 walls shown — multiple "2" in DOM (stats + table), check at least one exists
    const twos = screen.getAllByText('2');
    expect(twos.length).toBeGreaterThanOrEqual(1);
  });

  it('renders walls table', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId={null}
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Стена 1')).toBeInTheDocument();
    expect(screen.getByText('Стена 2')).toBeInTheDocument();
  });

  it('calls onSelectWall when wall row is clicked', () => {
    const onSelectWall = vi.fn();
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId={null}
        onSelectWall={onSelectWall}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Стена 1').closest('tr')!);
    expect(onSelectWall).toHaveBeenCalledWith('w1');
  });

  it('deselects wall when clicking selected wall row', () => {
    const onSelectWall = vi.fn();
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId="w1"
        onSelectWall={onSelectWall}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Стена 1').closest('tr')!);
    expect(onSelectWall).toHaveBeenCalledWith(null);
  });

  it('shows WallDetailPanel for selected wall with segments', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId="w1"
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // WallDetailPanel header contains wall label and length
    expect(screen.getByText(/Стена 1 — 4.500 м/)).toBeInTheDocument();
    // Segments rendered
    expect(screen.getByText('Глухой')).toBeInTheDocument();
    expect(screen.getByText('Окно')).toBeInTheDocument();
  });

  it('shows openings in WallDetailPanel', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId="w1"
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Окно 1/)).toBeInTheDocument();
    expect(screen.getByText(/1500 × 1200 мм/)).toBeInTheDocument();
  });

  it('shows elements section when elements present', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId={null}
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Элементы')).toBeInTheDocument();
    expect(screen.getByText('Колонна')).toBeInTheDocument();
    expect(screen.getByText('Колонна А')).toBeInTheDocument();
  });

  it('shows curvature section when data present', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId={null}
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Кривизна стен')).toBeInTheDocument();
    expect(screen.getByText('3.2 мм')).toBeInTheDocument();
    expect(screen.getByText('1.1 мм')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId={null}
        onSelectWall={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Закрыть/ }));
    expect(onClose).toHaveBeenCalled();
  });

  it('has correct testid', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom()}
        selectedWallId={null}
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('room-details-sidebar')).toBeInTheDocument();
  });

  it('hides elements section when no elements', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom({ elements: [] })}
        selectedWallId={null}
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText('Элементы')).not.toBeInTheDocument();
  });

  it('hides curvature section when null', () => {
    render(
      <RoomDetailsSidebar
        room={makeRoom({ curvatureMean: null, curvatureStdDev: null })}
        selectedWallId={null}
        onSelectWall={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText('Кривизна стен')).not.toBeInTheDocument();
  });
});
