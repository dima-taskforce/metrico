import { create } from 'zustand';
import type { FloorPlanRoom, FloorPlanAdjacency, GetPlanDto, RoomPlacement, AssemblyError } from '../types/api';

/** 1 meter = 100 pixels at scale=1 (wall lengths are stored in meters, must match PlanCanvas.MM_TO_PX) */
const METERS_TO_PX = 100;
const MIN_W = 80;
const MIN_H = 60;
const GAP = 40; // px between rooms
const MARGIN = 40; // px from canvas edge
const WRAP_AT = 1200; // px — wrap to new row after this width

function roomDimPx(room: FloorPlanRoom): { w: number; h: number } {
  const w = Math.max(MIN_W, Math.round((room.walls[0]?.length ?? 4) * METERS_TO_PX));
  const h = Math.max(MIN_H, Math.round((room.walls[1]?.length ?? 3) * METERS_TO_PX));
  return { w, h };
}

/**
 * Adjacency-aware layout: BFS from first room, placing each connected
 * neighbour on the correct side based on the connecting wall's sortOrder.
 * Unconnected rooms fall back to a simple grid.
 *
 * Wall sortOrder convention (clockwise):
 *   0 = top, 1 = right, 2 = bottom, 3 = left
 */
function computeAutoLayout(
  rooms: FloorPlanRoom[],
  adjacencies: FloorPlanAdjacency[] = [],
): Record<string, RoomPosition> {
  if (rooms.length === 0) return {};

  const positions: Record<string, RoomPosition> = {};
  const placed = new Set<string>();

  // Build wallId → roomId lookup
  const wallToRoom: Record<string, string> = {};
  for (const room of rooms) {
    for (const wall of room.walls) {
      wallToRoom[wall.id] = room.id;
    }
  }

  // BFS from first room
  const firstRoom = rooms[0]!;
  const firstDim = roomDimPx(firstRoom);
  positions[firstRoom.id] = { x: MARGIN, y: MARGIN, rotation: 0 };
  placed.add(firstRoom.id);
  const queue: string[] = [firstRoom.id];

  while (queue.length > 0) {
    const currentRoomId = queue.shift()!;
    const currentPos = positions[currentRoomId]!;
    const currentRoom = rooms.find((r) => r.id === currentRoomId);
    if (!currentRoom) continue;
    const { w: cw, h: ch } = roomDimPx(currentRoom);

    for (const adj of adjacencies) {
      // Determine which wall belongs to currentRoom and which to neighbour
      let myWallId: string, neighbourWallId: string;
      if (wallToRoom[adj.wallAId] === currentRoomId) {
        myWallId = adj.wallAId;
        neighbourWallId = adj.wallBId;
      } else if (wallToRoom[adj.wallBId] === currentRoomId) {
        myWallId = adj.wallBId;
        neighbourWallId = adj.wallAId;
      } else {
        continue;
      }

      const neighbourRoomId = wallToRoom[neighbourWallId];
      if (!neighbourRoomId || placed.has(neighbourRoomId)) continue;

      const neighbourRoom = rooms.find((r) => r.id === neighbourRoomId);
      if (!neighbourRoom) continue;
      const { w: nw, h: nh } = roomDimPx(neighbourRoom);

      const myWall = currentRoom.walls.find((w) => w.id === myWallId);
      const side = (myWall?.sortOrder ?? 1) % 4;

      let nx: number, ny: number;
      switch (side) {
        case 0: // my top wall → neighbour is above
          nx = currentPos.x;
          ny = currentPos.y - nh - GAP;
          break;
        case 1: // my right wall → neighbour is to the right
          nx = currentPos.x + cw + GAP;
          ny = currentPos.y;
          break;
        case 2: // my bottom wall → neighbour is below
          nx = currentPos.x;
          ny = currentPos.y + ch + GAP;
          break;
        case 3: // my left wall → neighbour is to the left
          nx = currentPos.x - nw - GAP;
          ny = currentPos.y;
          break;
        default:
          nx = currentPos.x + cw + GAP;
          ny = currentPos.y;
      }

      positions[neighbourRoomId] = { x: nx, y: ny, rotation: 0 };
      placed.add(neighbourRoomId);
      queue.push(neighbourRoomId);
    }
  }

  // Grid fallback for rooms not yet placed via adjacencies
  let curX = MARGIN;
  let curY = MARGIN + firstDim.h + GAP * 2;
  let rowMaxH = 0;

  for (const room of rooms) {
    if (placed.has(room.id)) continue;
    const { w, h } = roomDimPx(room);
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

/** 1mm → 0.1 px (since 1m = 100px) */
const MM_TO_PX = 0.1;

/**
 * Convert server placements (global mm) → canvas RoomPositions (px).
 * Also computes local polygon in px for each room.
 */
function placementsToPositions(
  placements: RoomPlacement[],
): {
  positions: Record<string, RoomPosition>;
  polygons: Record<string, number[]>;
} {
  const positions: Record<string, RoomPosition> = {};
  const polygons: Record<string, number[]> = {};

  for (const p of placements) {
    positions[p.roomId] = {
      x: p.x * MM_TO_PX + MARGIN,
      y: p.y * MM_TO_PX + MARGIN,
      rotation: p.rotation,
    };

    // Inverse-transform global polygon to local px coords
    const rotRad = (p.rotation * Math.PI) / 180;
    const cos = Math.cos(-rotRad);
    const sin = Math.sin(-rotRad);
    const flat: number[] = [];
    for (const pt of p.polygon) {
      const dx = pt.x - p.x;
      const dy = pt.y - p.y;
      flat.push((dx * cos - dy * sin) * MM_TO_PX);
      flat.push((dx * sin + dy * cos) * MM_TO_PX);
    }
    polygons[p.roomId] = flat;
  }

  return { positions, polygons };
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

  // Geometry assembly
  roomPolygons: Record<string, number[]>; // roomId -> flat [x,y,...] in px
  assemblyErrors: AssemblyError[];

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
  roomPolygons: {},
  assemblyErrors: [],
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
    let roomPolygons: Record<string, number[]> = {};

    // Priority: savedLayout > geometry placements > computeAutoLayout
    if (data.layoutJson) {
      try {
        const saved = JSON.parse(data.layoutJson) as Record<string, RoomPosition>;
        const missing = data.rooms.filter((r) => !saved[r.id]);
        if (missing.length === 0) {
          roomPositions = saved;
        } else {
          const autoPositions = computeAutoLayout(data.rooms, data.adjacencies);
          roomPositions = { ...autoPositions, ...saved };
        }
      } catch {
        roomPositions = computeAutoLayout(data.rooms, data.adjacencies);
      }
    } else if (data.placements && data.placements.length > 0) {
      const { positions, polygons } = placementsToPositions(data.placements);
      roomPositions = positions;
      roomPolygons = polygons;
      // Fill any rooms not covered by placements with auto-layout
      const placedIds = new Set(data.placements.map((p) => p.roomId));
      const unplaced = data.rooms.filter((r) => !placedIds.has(r.id));
      if (unplaced.length > 0) {
        const autoPositions = computeAutoLayout(unplaced, []);
        roomPositions = { ...roomPositions, ...autoPositions };
      }
    } else {
      roomPositions = computeAutoLayout(data.rooms, data.adjacencies);
    }

    set({
      projectId: data.projectId,
      rooms: data.rooms,
      adjacencies: data.adjacencies,
      generatedAt: data.generatedAt,
      roomPositions,
      roomPolygons,
      assemblyErrors: data.assemblyErrors ?? [],
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
