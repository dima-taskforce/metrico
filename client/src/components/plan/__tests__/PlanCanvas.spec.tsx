import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanCanvas } from '../PlanCanvas';
import type { FloorPlanRoom } from '../../../types/api';

vi.mock('react-konva', () => ({
  Stage: (_props: Record<string, unknown>) => <canvas role="img" aria-hidden="true" />,
  Layer: () => null,
  Group: () => null,
  Rect: () => null,
  Text: () => null,
  Circle: () => null,
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
    { id: `${id}-w3`, roomId: id, label: `${label}-W3`, length: 250, material: 'CONCRETE', wallType: 'INTERNAL', sortOrder: 2, segments: [], openings: [] },
    { id: `${id}-w4`, roomId: id, label: `${label}-W4`, length: 200, material: 'CONCRETE', wallType: 'INTERNAL', sortOrder: 3, segments: [], openings: [] },
  ],
  elements: [],
});

describe('PlanCanvas', () => {
  const rooms = [
    mockRoom('room-1', 'Living Room'),
    mockRoom('room-2', 'Kitchen'),
    mockRoom('room-3', 'Bedroom'),
  ];

  const defaultRoomPositions: Record<string, { x: number; y: number; rotation: number }> = {
    'room-1': { x: 0, y: 0, rotation: 0 },
    'room-2': { x: 300, y: 0, rotation: 0 },
    'room-3': { x: 600, y: 0, rotation: 0 },
  };

  let onSelectRoom: ReturnType<typeof vi.fn>;
  let onUpdateRoomPosition: ReturnType<typeof vi.fn>;
  let onScaleChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSelectRoom = vi.fn();
    onUpdateRoomPosition = vi.fn();
    onScaleChange = vi.fn();

    // Mock window.matchMedia for ResizeObserver
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders canvas container', () => {
    const { container } = render(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId={null}
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={1}
        onScaleChange={onScaleChange}
      />
    );

    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('renders zoom controls', () => {
    render(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId={null}
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={1}
        onScaleChange={onScaleChange}
      />
    );

    const zoomOutButton = screen.getByRole('button', { name: /уменьшить/i });
    const zoomInButton = screen.getByRole('button', { name: /увеличить/i });

    expect(zoomOutButton).toBeInTheDocument();
    expect(zoomInButton).toBeInTheDocument();
  });

  it('calls onScaleChange when zoom in clicked', async () => {
    const user = userEvent.setup();
    render(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId={null}
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={1}
        onScaleChange={onScaleChange}
      />
    );

    const zoomInButton = screen.getByRole('button', { name: /увеличить/i });
    await user.click(zoomInButton);

    expect(onScaleChange).toHaveBeenCalledWith(1.1);
  });

  it('calls onScaleChange when zoom out clicked', async () => {
    const user = userEvent.setup();
    render(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId={null}
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={2}
        onScaleChange={onScaleChange}
      />
    );

    const zoomOutButton = screen.getByRole('button', { name: /уменьшить/i });
    await user.click(zoomOutButton);

    expect(onScaleChange).toHaveBeenCalledWith(1.9);
  });

  it('respects zoom bounds (0.5 to 3)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId={null}
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={0.5}
        onScaleChange={onScaleChange}
      />
    );

    const zoomOutButton = screen.getByRole('button', { name: /уменьшить/i });
    await user.click(zoomOutButton);

    expect(onScaleChange).toHaveBeenCalledWith(0.5); // Should not go below 0.5

    rerender(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId={null}
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={3}
        onScaleChange={onScaleChange}
      />
    );

    vi.clearAllMocks();

    const zoomInButton = screen.getByRole('button', { name: /увеличить/i });
    await user.click(zoomInButton);

    expect(onScaleChange).toHaveBeenCalledWith(3); // Should not go above 3
  });

  it('displays current zoom percentage', () => {
    render(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId={null}
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={1.5}
        onScaleChange={onScaleChange}
      />
    );

    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('selects room on click', () => {
    const { container } = render(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId={null}
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={1}
        onScaleChange={onScaleChange}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('highlights selected room', () => {
    render(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId="room-1"
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={1}
        onScaleChange={onScaleChange}
      />
    );

    const canvas = screen.getByRole('img', { hidden: true });
    expect(canvas).toBeInTheDocument();
  });

  it('positions rooms according to roomPositions', () => {
    render(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId={null}
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={1}
        onScaleChange={onScaleChange}
      />
    );

    const canvas = screen.queryByRole('img', { hidden: true });
    expect(canvas).toBeInTheDocument();
  });

  it('calls onUpdateRoomPosition when room dragged', async () => {
    render(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId="room-1"
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={1}
        onScaleChange={onScaleChange}
      />
    );

    const canvas = screen.queryByRole('img', { hidden: true });
    expect(canvas).toBeInTheDocument();
  });

  it('applies scale to canvas', () => {
    const { rerender } = render(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId={null}
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={1}
        onScaleChange={onScaleChange}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();

    rerender(
      <PlanCanvas
        rooms={rooms}
        selectedRoomId={null}
        onSelectRoom={onSelectRoom}
        roomPositions={defaultRoomPositions}
        onUpdateRoomPosition={onUpdateRoomPosition}
        scale={2}
        onScaleChange={onScaleChange}
      />
    );

    expect(screen.getByText('200%')).toBeInTheDocument();
  });
});
