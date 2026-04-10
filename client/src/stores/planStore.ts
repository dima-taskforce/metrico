import { create } from 'zustand';
import type { FloorPlanRoom, FloorPlanAdjacency, GetPlanDto } from '../types/api';

/** 1 pixel = 10 mm at scale=1 (must match PlanCanvas.MM_TO_PX) */
const MM_TO_PX = 0.1;
const MIN_W = 80;
const MIN_H = 60;
const GAP = 40; // px between rooms
const MARGIN = 40; // px from canvas edge
const WRAP_AT = 1200; // px — wrap to new row after this width

function roomDimPx(room: FloorPlanRoom): { w: number; h: number } {
  const w = Math.max(MIN_W, Math.round((room.walls[0]?.length ?? 2000) * MM_TO_PX));
  const h = Math.max(MIN_H, Math.round((room.walls[1]?.length ?? 1500) * MM_TO_PX));
  return { w, h };
}

/**
 * Grid auto-layout: place rooms left→right, wrapping to new row when
 * the next room would exceed WRAP_AT. Each room gets real dimensions
 * derived from wall lengths.
 */
function computeAutoLayout(rooms: FloorPlanRoom[]): Record<string, RoomPosition> {
  const positions: Record<string, RoomPosition> = {};
  let curX = MARGIN;
  let curY = MARGIN;
  let rowMaxH = 0;

  for (const room of rooms) {
    const { w, h } = roomDimPx(room);

    // Wrap if this room won't fit in the current row (and we're not at the start)
    if (curX > MARGIN && curX + w > WRAP_AT) {
      curX = MARGIN;
      curY += rowMaxH + GAP;
      rowMaxH = 0;
    }

    positions[room.id] = { x: curX, y: curY, rotation: 0 };
    curX += w + GAP;
    rowMaxH = Math.max(rowMaxH, h);
  }

  return positions;
}

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
    let roomPositions: Record<string, RoomPosition>;

    // Restore saved layout if available
    if (data.layoutJson) {
      try {
        const saved = JSON.parse(data.layoutJson) as Record<string, RoomPosition>;
        // Validate that saved positions cover all rooms; fill gaps with auto-layout
        const missing = data.rooms.filter((r) => !saved[r.id]);
        if (missing.length === 0) {
          roomPositions = saved;
        } else {
          // Partial save — merge saved with auto-layout for new rooms
          const autoPositions = computeAutoLayout(data.rooms);
          roomPositions = { ...autoPositions, ...saved };
        }
      } catch {
        roomPositions = computeAutoLayout(data.rooms);
      }
    } else {
      roomPositions = computeAutoLayout(data.rooms);
    }

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
