import { create } from 'zustand';
import type { Room, Wall, WindowOpening, DoorOpening, WallSegment, RoomElement, Angle } from '../types/api';

export type MeasureSubstep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface RoomMeasureState {
  // Current context
  currentRoom: Room | null;
  currentSubstep: MeasureSubstep;

  // Data loaded from server
  walls: Wall[];
  windows: Record<string, WindowOpening[]>; // wallId → windows
  doors: Record<string, DoorOpening[]>; // wallId → doors
  segments: Record<string, WallSegment[]>; // wallId → segments
  elements: RoomElement[];
  angles: Angle[];

  // UI state
  activeWallId: string | null;
  isDirty: boolean;

  // Setters
  setCurrentRoom: (room: Room | null) => void;
  setSubstep: (step: MeasureSubstep) => void;
  setWalls: (walls: Wall[]) => void;
  setWindows: (wallId: string, windows: WindowOpening[]) => void;
  setDoors: (wallId: string, doors: DoorOpening[]) => void;
  setSegments: (wallId: string, segments: WallSegment[]) => void;
  setElements: (elements: RoomElement[]) => void;
  setAngles: (angles: Angle[]) => void;
  setActiveWallId: (wallId: string | null) => void;
  setIsDirty: (isDirty: boolean) => void;

  // Updaters
  upsertWall: (wall: Wall) => void;
  removeWall: (wallId: string) => void;
  upsertWindow: (wallId: string, window: WindowOpening) => void;
  removeWindow: (wallId: string, windowId: string) => void;
  upsertDoor: (wallId: string, door: DoorOpening) => void;
  removeDoor: (wallId: string, doorId: string) => void;
  upsertSegment: (wallId: string, segment: WallSegment) => void;
  removeSegment: (wallId: string, segmentId: string) => void;
  upsertElement: (element: RoomElement) => void;
  removeElement: (elementId: string) => void;
  upsertAngle: (angle: Angle) => void;
  removeAngle: (angleId: string) => void;

  reset: () => void;
}

const initialState = {
  currentRoom: null,
  currentSubstep: 1 as MeasureSubstep,
  walls: [],
  windows: {},
  doors: {},
  segments: {},
  elements: [],
  angles: [],
  activeWallId: null,
  isDirty: false,
};

export const useRoomMeasureStore = create<RoomMeasureState>((set) => ({
  ...initialState,

  setCurrentRoom: (room) => set({ currentRoom: room }),
  setSubstep: (step) => set({ currentSubstep: step }),
  setWalls: (walls) => set({ walls, isDirty: true }),
  setWindows: (wallId, windows) =>
    set((s) => ({ windows: { ...s.windows, [wallId]: windows }, isDirty: true })),
  setDoors: (wallId, doors) =>
    set((s) => ({ doors: { ...s.doors, [wallId]: doors }, isDirty: true })),
  setSegments: (wallId, segments) =>
    set((s) => ({ segments: { ...s.segments, [wallId]: segments }, isDirty: true })),
  setElements: (elements) => set({ elements, isDirty: true }),
  setAngles: (angles) => set({ angles, isDirty: true }),
  setActiveWallId: (wallId) => set({ activeWallId: wallId }),
  setIsDirty: (isDirty) => set({ isDirty }),

  upsertWall: (wall) =>
    set((s) => {
      const idx = s.walls.findIndex((w) => w.id === wall.id);
      if (idx >= 0) {
        const updated = [...s.walls];
        updated[idx] = wall;
        return { walls: updated };
      }
      return { walls: [...s.walls, wall].sort((a, b) => a.sortOrder - b.sortOrder) };
    }),

  removeWall: (wallId) =>
    set((s) => ({ walls: s.walls.filter((w) => w.id !== wallId) })),

  upsertWindow: (wallId, window) =>
    set((s) => {
      const list = s.windows[wallId] ?? [];
      const idx = list.findIndex((w) => w.id === window.id);
      const updated = idx >= 0
        ? list.map((w) => (w.id === window.id ? window : w))
        : [...list, window];
      return { windows: { ...s.windows, [wallId]: updated } };
    }),

  removeWindow: (wallId, windowId) =>
    set((s) => ({
      windows: {
        ...s.windows,
        [wallId]: (s.windows[wallId] ?? []).filter((w) => w.id !== windowId),
      },
    })),

  upsertDoor: (wallId, door) =>
    set((s) => {
      const list = s.doors[wallId] ?? [];
      const idx = list.findIndex((d) => d.id === door.id);
      const updated = idx >= 0
        ? list.map((d) => (d.id === door.id ? door : d))
        : [...list, door];
      return { doors: { ...s.doors, [wallId]: updated } };
    }),

  removeDoor: (wallId, doorId) =>
    set((s) => ({
      doors: {
        ...s.doors,
        [wallId]: (s.doors[wallId] ?? []).filter((d) => d.id !== doorId),
      },
    })),

  upsertSegment: (wallId, segment) =>
    set((s) => {
      const list = s.segments[wallId] ?? [];
      const idx = list.findIndex((seg) => seg.id === segment.id);
      const updated = idx >= 0
        ? list.map((seg) => (seg.id === segment.id ? segment : seg))
        : [...list, segment];
      return {
        segments: {
          ...s.segments,
          [wallId]: updated.sort((a, b) => a.sortOrder - b.sortOrder),
        },
      };
    }),

  removeSegment: (wallId, segmentId) =>
    set((s) => ({
      segments: {
        ...s.segments,
        [wallId]: (s.segments[wallId] ?? []).filter((seg) => seg.id !== segmentId),
      },
    })),

  upsertElement: (element) =>
    set((s) => {
      const idx = s.elements.findIndex((e) => e.id === element.id);
      if (idx >= 0) {
        const updated = [...s.elements];
        updated[idx] = element;
        return { elements: updated };
      }
      return { elements: [...s.elements, element] };
    }),

  removeElement: (elementId) =>
    set((s) => ({ elements: s.elements.filter((e) => e.id !== elementId) })),

  upsertAngle: (angle) =>
    set((s) => {
      const idx = s.angles.findIndex((a) => a.id === angle.id);
      if (idx >= 0) {
        const updated = [...s.angles];
        updated[idx] = angle;
        return { angles: updated };
      }
      return { angles: [...s.angles, angle] };
    }),

  removeAngle: (angleId) =>
    set((s) => ({ angles: s.angles.filter((a) => a.id !== angleId) })),

  reset: () => set(initialState),
}));
