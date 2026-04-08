import { create } from 'zustand';
import type { FloorPlanRoom, FloorPlanAdjacency, GetPlanDto } from '../types/api';

export type PlanStatus = 'idle' | 'loading' | 'assembling' | 'done' | 'error';

interface RoomPosition {
  x: number;
  y: number;
  rotation: number; // в градусах
}

interface PlanState {
  // Plan data from server
  projectId: string | null;
  rooms: FloorPlanRoom[];
  adjacencies: FloorPlanAdjacency[];
  generatedAt: Date | null;

  // Canvas state
  selectedRoomId: string | null;
  roomPositions: Record<string, RoomPosition>; // roomId -> position
  scale: number; // для zoom на мобильных
  status: PlanStatus;
  error: string | null;

  // UI state
  layoutJson: string | null;

  // Setters
  setPlanData: (data: GetPlanDto) => void;
  setSelectedRoomId: (roomId: string | null) => void;
  updateRoomPosition: (roomId: string, position: Partial<RoomPosition>) => void;
  setScale: (scale: number) => void;
  setStatus: (status: PlanStatus) => void;
  setError: (error: string | null) => void;
  setLayoutJson: (layoutJson: string) => void;

  // Adjacency management
  addAdjacency: (adjacency: FloorPlanAdjacency) => void;
  removeAdjacency: (adjacencyId: string) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  projectId: null,
  rooms: [],
  adjacencies: [],
  generatedAt: null,
  selectedRoomId: null,
  roomPositions: {},
  scale: 1,
  status: 'idle' as const,
  error: null,
  layoutJson: null,
};

export const usePlanStore = create<PlanState>((set) => ({
  ...initialState,

  setPlanData: (data) => {
    // Initialize room positions from any existing layout or default
    const roomPositions: Record<string, RoomPosition> = {};
    data.rooms.forEach((room, idx) => {
      roomPositions[room.id] = {
        x: idx * 300,
        y: 0,
        rotation: 0,
      };
    });

    set({
      projectId: data.projectId,
      rooms: data.rooms,
      adjacencies: data.adjacencies,
      generatedAt: data.generatedAt,
      roomPositions,
    });
  },

  setSelectedRoomId: (roomId) => set({ selectedRoomId: roomId }),

  updateRoomPosition: (roomId, position) =>
    set((state) => {
      const current = state.roomPositions[roomId] ?? { x: 0, y: 0, rotation: 0 };
      return {
        roomPositions: {
          ...state.roomPositions,
          [roomId]: {
            ...current,
            ...position,
          },
        },
      };
    }),

  setScale: (scale) => set({ scale }),

  setStatus: (status) => set({ status }),

  setError: (error) => set({ error }),

  setLayoutJson: (layoutJson) => set({ layoutJson }),

  addAdjacency: (adjacency) =>
    set((state) => {
      const exists = state.adjacencies.some((a) => a.id === adjacency.id);
      if (exists) return state;
      return { adjacencies: [...state.adjacencies, adjacency] };
    }),

  removeAdjacency: (adjacencyId) =>
    set((state) => ({
      adjacencies: state.adjacencies.filter((a) => a.id !== adjacencyId),
    })),

  reset: () => set(initialState),
}));
