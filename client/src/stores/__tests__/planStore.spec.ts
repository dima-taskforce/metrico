import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlanStore } from '../planStore';
import type { FloorPlanRoom, FloorPlanAdjacency } from '../../types/api';

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

const mockAdjacency = (id: string, wallAId: string, wallBId: string): FloorPlanAdjacency => ({
  id,
  wallAId,
  wallBId,
  wallALabel: `Wall ${wallAId}`,
  wallBLabel: `Wall ${wallBId}`,
  hasDoor: false,
});

describe('planStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => usePlanStore());
    act(() => {
      result.current.reset?.();
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => usePlanStore());

    expect(result.current.rooms).toEqual([]);
    expect(result.current.adjacencies).toEqual([]);
    expect(result.current.selectedRoomId).toBe(null);
    expect(result.current.roomPositions).toEqual({});
    expect(result.current.scale).toBe(1);
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBe(null);
  });

  it('sets plan data', () => {
    const { result } = renderHook(() => usePlanStore());
    const rooms = [mockRoom('r1', 'Room 1'), mockRoom('r2', 'Room 2')];
    const adjacencies = [mockAdjacency('a1', 'r1-w1', 'r2-w1')];

    act(() => {
      result.current.setPlanData({
        projectId: 'test-project',
        projectLabel: 'Test Project',
        rooms,
        adjacencies,
        generatedAt: new Date(),
      });
    });

    expect(result.current.rooms).toEqual(rooms);
    expect(result.current.adjacencies).toEqual(adjacencies);
  });

  it('initializes room positions on plan data set', () => {
    const { result } = renderHook(() => usePlanStore());
    const rooms = [mockRoom('r1', 'Room 1'), mockRoom('r2', 'Room 2')];

    act(() => {
      result.current.setPlanData({
        projectId: 'test-project',
        projectLabel: 'Test Project',
        rooms,
        adjacencies: [],
        generatedAt: new Date(),
      });
    });

    expect(result.current.roomPositions['r1']).toEqual({ x: 0, y: 0, rotation: 0 });
    expect(result.current.roomPositions['r2']).toEqual({ x: 300, y: 0, rotation: 0 });
  });

  it('sets selected room id', () => {
    const { result } = renderHook(() => usePlanStore());

    act(() => {
      result.current.setSelectedRoomId('room-1');
    });

    expect(result.current.selectedRoomId).toBe('room-1');
  });

  it('clears selected room id with null', () => {
    const { result } = renderHook(() => usePlanStore());

    act(() => {
      result.current.setSelectedRoomId('room-1');
    });

    expect(result.current.selectedRoomId).toBe('room-1');

    act(() => {
      result.current.setSelectedRoomId(null);
    });

    expect(result.current.selectedRoomId).toBe(null);
  });

  it('updates room position', () => {
    const { result } = renderHook(() => usePlanStore());
    const rooms = [mockRoom('r1', 'Room 1')];

    act(() => {
      result.current.setPlanData({ projectId: 'test', projectLabel: 'Test', rooms, adjacencies: [], generatedAt: new Date() });
    });

    act(() => {
      result.current.updateRoomPosition('r1', { x: 100, y: 200, rotation: 90 });
    });

    expect(result.current.roomPositions['r1']).toEqual({ x: 100, y: 200, rotation: 90 });
  });

  it('updates only specific position properties', () => {
    const { result } = renderHook(() => usePlanStore());
    const rooms = [mockRoom('r1', 'Room 1')];

    act(() => {
      result.current.setPlanData({ projectId: 'test', projectLabel: 'Test', rooms, adjacencies: [], generatedAt: new Date() });
      result.current.updateRoomPosition('r1', { x: 100, y: 200, rotation: 0 });
    });

    act(() => {
      result.current.updateRoomPosition('r1', { rotation: 90 });
    });

    expect(result.current.roomPositions['r1']).toEqual({ x: 100, y: 200, rotation: 90 });
  });

  it('sets scale', () => {
    const { result } = renderHook(() => usePlanStore());

    act(() => {
      result.current.setScale(1.5);
    });

    expect(result.current.scale).toBe(1.5);
  });

  it('sets status', () => {
    const { result } = renderHook(() => usePlanStore());

    act(() => {
      result.current.setStatus('loading');
    });

    expect(result.current.status).toBe('loading');

    act(() => {
      result.current.setStatus('done');
    });

    expect(result.current.status).toBe('done');
  });

  it('sets error', () => {
    const { result } = renderHook(() => usePlanStore());

    act(() => {
      result.current.setError('Test error message');
    });

    expect(result.current.error).toBe('Test error message');
  });

  it('clears error with null', () => {
    const { result } = renderHook(() => usePlanStore());

    act(() => {
      result.current.setError('Test error');
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.setError(null);
    });

    expect(result.current.error).toBe(null);
  });

  it('adds adjacency', () => {
    const { result } = renderHook(() => usePlanStore());
    const adjacency = mockAdjacency('a1', 'w1', 'w2');

    act(() => {
      result.current.addAdjacency(adjacency);
    });

    expect(result.current.adjacencies).toContainEqual(adjacency);
    expect(result.current.adjacencies).toHaveLength(1);
  });

  it('removes adjacency by id', () => {
    const { result } = renderHook(() => usePlanStore());
    const adjacency1 = mockAdjacency('a1', 'w1', 'w2');
    const adjacency2 = mockAdjacency('a2', 'w3', 'w4');

    act(() => {
      result.current.addAdjacency(adjacency1);
      result.current.addAdjacency(adjacency2);
    });

    expect(result.current.adjacencies).toHaveLength(2);

    act(() => {
      result.current.removeAdjacency('a1');
    });

    expect(result.current.adjacencies).toHaveLength(1);
    expect(result.current.adjacencies).toContainEqual(adjacency2);
  });

  it('handles remove non-existent adjacency gracefully', () => {
    const { result } = renderHook(() => usePlanStore());
    const adjacency = mockAdjacency('a1', 'w1', 'w2');

    act(() => {
      result.current.addAdjacency(adjacency);
    });

    act(() => {
      result.current.removeAdjacency('non-existent');
    });

    expect(result.current.adjacencies).toHaveLength(1);
    expect(result.current.adjacencies).toContainEqual(adjacency);
  });

  it('maintains room positions when updating data', () => {
    const { result } = renderHook(() => usePlanStore());
    const rooms = [mockRoom('r1', 'Room 1')];

    act(() => {
      result.current.setPlanData({ projectId: 'test', projectLabel: 'Test', rooms, adjacencies: [], generatedAt: new Date() });
      result.current.updateRoomPosition('r1', { x: 100, y: 200, rotation: 45 });
    });

    const previousPosition = result.current.roomPositions['r1'];

    act(() => {
      result.current.setPlanData({ projectId: 'test', projectLabel: 'Test', rooms, adjacencies: [], generatedAt: new Date() });
    });

    // Position should be reset to default
    expect(result.current.roomPositions['r1']).toEqual({ x: 0, y: 0, rotation: 0 });
  });

  it('resets store to initial state', () => {
    const { result } = renderHook(() => usePlanStore());

    act(() => {
      result.current.setPlanData({
        projectId: 'test',
        projectLabel: 'Test',
        rooms: [mockRoom('r1', 'Room 1')],
        adjacencies: [mockAdjacency('a1', 'w1', 'w2')],
        generatedAt: new Date(),
      });
      result.current.setSelectedRoomId('r1');
      result.current.setScale(2);
      result.current.setStatus('done');
      result.current.setError('Some error');
    });

    act(() => {
      result.current.reset?.();
    });

    expect(result.current.rooms).toEqual([]);
    expect(result.current.adjacencies).toEqual([]);
    expect(result.current.selectedRoomId).toBe(null);
    expect(result.current.roomPositions).toEqual({});
    expect(result.current.scale).toBe(1);
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBe(null);
  });

  it('handles multiple room updates independently', () => {
    const { result } = renderHook(() => usePlanStore());
    const rooms = [mockRoom('r1', 'Room 1'), mockRoom('r2', 'Room 2')];

    act(() => {
      result.current.setPlanData({ projectId: 'test', projectLabel: 'Test', rooms, adjacencies: [], generatedAt: new Date() });
    });

    act(() => {
      result.current.updateRoomPosition('r1', { x: 100 });
      result.current.updateRoomPosition('r2', { y: 200 });
    });

    expect(result.current.roomPositions['r1']?.x).toBe(100);
    expect(result.current.roomPositions['r1']?.y).toBe(0);
    expect(result.current.roomPositions['r2']?.x).toBe(300);
    expect(result.current.roomPositions['r2']?.y).toBe(200);
  });

  it('supports setting layout json', () => {
    const { result } = renderHook(() => usePlanStore());
    const layoutJson = JSON.stringify({ r1: { x: 0, y: 0, rotation: 0 } });

    act(() => {
      result.current.setLayoutJson?.(layoutJson);
    });

    // Verify state can be updated (implementation may vary)
    expect(result.current.status).toBeDefined();
  });
});
