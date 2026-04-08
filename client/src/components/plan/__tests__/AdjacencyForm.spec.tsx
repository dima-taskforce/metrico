import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdjacencyForm } from '../AdjacencyForm';
import type { FloorPlanRoom } from '../../../types/api';

const mockRoom = (id: string, name: string, walls: number = 4): FloorPlanRoom => ({
  id,
  label: name,
  perimeter: 1000,
  area: 5000,
  volume: 2700,
  ceilingHeight: 2.7,
  curvatureMean: 0,
  curvatureStdDev: 0,
  walls: Array.from({ length: walls }, (_, i) => ({
    id: `wall-${id}-${i}`,
    roomId: id,
    label: `${name}-W${i + 1}`,
    length: 250,
    material: 'CONCRETE',
    wallType: 'INTERNAL',
    sortOrder: i,
    segments: [],
    openings: [],
  })),
  elements: [],
});

describe('AdjacencyForm', () => {
  const rooms = [
    mockRoom('room-1', 'Living Room'),
    mockRoom('room-2', 'Kitchen'),
    mockRoom('room-3', 'Bedroom'),
  ];

  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn();
  });

  it('renders form with room selects', () => {
    render(<AdjacencyForm rooms={rooms} onSubmit={onSubmit} isLoading={false} />);

    expect(screen.getByText('Комната 1')).toBeInTheDocument();
    expect(screen.getByText('Комната 2')).toBeInTheDocument();
    expect(screen.getByText('Стена комнаты 1')).toBeInTheDocument();
    expect(screen.getByText('Стена комнаты 2')).toBeInTheDocument();
  });

  it('populates wall options based on selected room', async () => {
    const user = userEvent.setup();
    render(<AdjacencyForm rooms={rooms} onSubmit={onSubmit} isLoading={false} />);

    const roomSelect = screen.getAllByRole('combobox')[0];
    await user.click(roomSelect!);
    await user.selectOptions(roomSelect!, 'room-1');

    const wallSelect = screen.getAllByRole('combobox')[1];
    expect((wallSelect as HTMLSelectElement).disabled).toBe(false);
  });

  it('disables wall select when no room selected', () => {
    render(<AdjacencyForm rooms={rooms} onSubmit={onSubmit} isLoading={false} />);

    const wallSelects = screen.getAllByRole('combobox');
    expect((wallSelects[1] as HTMLSelectElement).disabled).toBe(true);
    expect((wallSelects[3] as HTMLSelectElement).disabled).toBe(true);
  });

  it('calls onSubmit with form data', async () => {
    const user = userEvent.setup();
    onSubmit.mockResolvedValue(undefined);

    render(<AdjacencyForm rooms={rooms} onSubmit={onSubmit} isLoading={false} />);

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, 'room-1');
    await user.selectOptions(selects[1]!, 'wall-room-1-0');
    await user.selectOptions(selects[2]!, 'room-2');
    await user.selectOptions(selects[3]!, 'wall-room-2-0');

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const submitButton = screen.getByRole('button', { name: /создать/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        wallAId: 'wall-room-1-0',
        wallBId: 'wall-room-2-0',
        hasDoorBetween: true,
      });
    });
  });

  it('resets form after successful submission', async () => {
    const user = userEvent.setup();
    onSubmit.mockResolvedValue(undefined);

    render(<AdjacencyForm rooms={rooms} onSubmit={onSubmit} isLoading={false} />);

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, 'room-1');
    await user.selectOptions(selects[1]!, 'wall-room-1-0');
    await user.selectOptions(selects[2]!, 'room-2');
    await user.selectOptions(selects[3]!, 'wall-room-2-0');

    const submitButton = screen.getByRole('button', { name: /создать/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect((selects[0] as HTMLSelectElement).value).toBe('');
    });
  });

  it('disables submit button while loading', () => {
    render(<AdjacencyForm rooms={rooms} onSubmit={onSubmit} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /создание/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows validation error for missing fields', async () => {
    const user = userEvent.setup();
    render(<AdjacencyForm rooms={rooms} onSubmit={onSubmit} isLoading={false} />);

    const submitButton = screen.getByRole('button', { name: /создать/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('requires door selection in hasDoorBetween', async () => {
    const user = userEvent.setup();
    onSubmit.mockResolvedValue(undefined);

    render(<AdjacencyForm rooms={rooms} onSubmit={onSubmit} isLoading={false} />);

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, 'room-1');
    await user.selectOptions(selects[1]!, 'wall-room-1-0');
    await user.selectOptions(selects[2]!, 'room-2');
    await user.selectOptions(selects[3]!, 'wall-room-2-0');

    const submitButton = screen.getByRole('button', { name: /создать/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          hasDoorBetween: false,
        })
      );
    });
  });
});
