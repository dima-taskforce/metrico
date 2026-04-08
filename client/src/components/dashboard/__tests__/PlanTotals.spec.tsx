import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanTotals } from '../PlanTotals';
import type { FloorPlanRoom } from '../../../types/api';

const makeRoom = (id: string, label: string, overrides: Partial<FloorPlanRoom> = {}): FloorPlanRoom => ({
  id,
  label,
  perimeter: 10000, // 10 m in mm
  area: 15.5,
  volume: 41.85,
  ceilingHeight: 2.7,
  curvatureMean: null,
  curvatureStdDev: null,
  walls: [
    { id: `${id}-w1`, roomId: id, label: 'W1', length: 3000, material: 'CONCRETE', wallType: 'EXTERNAL', sortOrder: 0, segments: [], openings: [] },
    { id: `${id}-w2`, roomId: id, label: 'W2', length: 3000, material: 'CONCRETE', wallType: 'EXTERNAL', sortOrder: 1, segments: [], openings: [] },
    { id: `${id}-w3`, roomId: id, label: 'W3', length: 2000, material: 'CONCRETE', wallType: 'INTERNAL', sortOrder: 2, segments: [], openings: [] },
    { id: `${id}-w4`, roomId: id, label: 'W4', length: 2000, material: 'CONCRETE', wallType: 'INTERNAL', sortOrder: 3, segments: [], openings: [] },
  ],
  elements: [],
  ...overrides,
});

describe('PlanTotals', () => {
  it('renders project label in heading', () => {
    render(<PlanTotals rooms={[]} projectLabel="Тестовый проект" />);
    expect(screen.getByText(/Тестовый проект/)).toBeInTheDocument();
  });

  it('shows rooms count stat', () => {
    const rooms = [makeRoom('r1', 'Зал'), makeRoom('r2', 'Кухня')];
    render(<PlanTotals rooms={rooms} projectLabel="Проект" />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows total area summed across rooms', () => {
    const rooms = [
      makeRoom('r1', 'Зал', { area: 20.0 }),
      makeRoom('r2', 'Кухня', { area: 10.0 }),
    ];
    render(<PlanTotals rooms={rooms} projectLabel="Проект" />);
    // Total = 30.0, shown as 30.0 in the stats card
    expect(screen.getByText('30.0')).toBeInTheDocument();
  });

  it('renders rooms table when rooms provided', () => {
    const rooms = [makeRoom('r1', 'Гостиная')];
    render(<PlanTotals rooms={rooms} projectLabel="Проект" />);
    expect(screen.getByRole('table', { name: /Таблица помещений/ })).toBeInTheDocument();
    expect(screen.getByText('Гостиная')).toBeInTheDocument();
  });

  it('does not render table when no rooms', () => {
    render(<PlanTotals rooms={[]} projectLabel="Проект" />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows totals row in table footer', () => {
    const rooms = [makeRoom('r1', 'Зал')];
    render(<PlanTotals rooms={rooms} projectLabel="Проект" />);
    expect(screen.getByText('Итого')).toBeInTheDocument();
  });

  it('handles null area gracefully', () => {
    const rooms = [makeRoom('r1', 'Кладовая', { area: null })];
    render(<PlanTotals rooms={rooms} projectLabel="Проект" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('converts perimeter from mm to m', () => {
    const rooms = [makeRoom('r1', 'Зал', { perimeter: 14000 })]; // 14m
    render(<PlanTotals rooms={rooms} projectLabel="Проект" />);
    // perimeter in table: 14.00 m — multiple cells with same value, just verify presence
    const cells = screen.getAllByText('14.00');
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });

  it('shows total walls count per room', () => {
    const rooms = [makeRoom('r1', 'Зал')]; // 4 walls
    render(<PlanTotals rooms={rooms} projectLabel="Проект" />);
    // 4 shown in the row; also in footer total
    const cells = screen.getAllByText('4');
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });
});
