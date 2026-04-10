import { create } from 'zustand';
import type { SketchNode, SketchEdge, SketchRoom, SketchData } from '../types/sketch';

type SketchMode = 'draw' | 'select' | 'room' | 'edit';

interface SketchState {
  // Data
  nodes: SketchNode[];
  edges: SketchEdge[];
  rooms: SketchRoom[];

  // UI state
  mode: SketchMode;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedRoomId: string | null;
  activeNodeId: string | null;
  isDirty: boolean;
  gridSize: number;

  // Setters
  setMode: (mode: SketchMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setSelectedRoomId: (id: string | null) => void;

  // Node operations
  addNode: (node: SketchNode) => void;
  moveNode: (id: string, x: number, y: number) => void;
  removeNode: (id: string) => void;

  // Edge operations
  addEdge: (edge: SketchEdge) => void;
  removeEdge: (id: string) => void;

  // Room operations
  addRoom: (room: SketchRoom) => void;
  updateRoom: (id: string, data: Partial<SketchRoom>) => void;
  removeRoom: (id: string) => void;

  // Bulk
  loadSketch: (data: SketchData) => void;
  toSketchData: () => SketchData;
  reset: () => void;
}

const GRID = 20;

function snapToGrid(val: number, grid: number): number {
  return Math.round(val / grid) * grid;
}

const initialState = {
  nodes: [] as SketchNode[],
  edges: [] as SketchEdge[],
  rooms: [] as SketchRoom[],
  mode: 'draw' as SketchMode,
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedRoomId: null,
  activeNodeId: null,
  isDirty: false,
  gridSize: GRID,
};

export const useSketchStore = create<SketchState>((set, get) => ({
  ...initialState,

  setMode: (mode) => set({ mode, selectedNodeId: null, selectedEdgeId: null, selectedRoomId: null }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),

  addNode: (node) => set((s) => ({
    nodes: [...s.nodes, { ...node, x: snapToGrid(node.x, s.gridSize), y: snapToGrid(node.y, s.gridSize) }],
    isDirty: true,
  })),

  moveNode: (id, x, y) => set((s) => ({
    nodes: s.nodes.map((n) => n.id === id ? { ...n, x: snapToGrid(x, s.gridSize), y: snapToGrid(y, s.gridSize) } : n),
    isDirty: true,
  })),

  removeNode: (id) => set((s) => ({
    nodes: s.nodes.filter((n) => n.id !== id),
    edges: s.edges.filter((e) => e.fromNodeId !== id && e.toNodeId !== id),
    isDirty: true,
  })),

  addEdge: (edge) => set((s) => {
    const exists = s.edges.some(
      (e) => (e.fromNodeId === edge.fromNodeId && e.toNodeId === edge.toNodeId) ||
             (e.fromNodeId === edge.toNodeId && e.toNodeId === edge.fromNodeId),
    );
    if (exists) return s;
    return { edges: [...s.edges, edge], isDirty: true, activeNodeId: edge.toNodeId };
  }),

  removeEdge: (id) => set((s) => ({
    edges: s.edges.filter((e) => e.id !== id),
    isDirty: true,
  })),

  addRoom: (room) => set((s) => ({ rooms: [...s.rooms, room], isDirty: true })),

  updateRoom: (id, data) => set((s) => ({
    rooms: s.rooms.map((r) => r.id === id ? { ...r, ...data } : r),
    isDirty: true,
  })),

  removeRoom: (id) => set((s) => ({
    rooms: s.rooms.filter((r) => r.id !== id),
    isDirty: true,
  })),

  loadSketch: (data) => set({
    nodes: data.nodes,
    edges: data.edges,
    rooms: data.rooms,
    isDirty: false,
  }),

  toSketchData: () => {
    const { nodes, edges, rooms } = get();
    return { nodes, edges, rooms };
  },

  reset: () => set(initialState),
}));
