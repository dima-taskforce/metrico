import { api } from './client';
import type { WindowOpening, DoorOpening } from '../types/api';

export interface CreateWindowData {
  width: number;
  height: number;
  sillHeightFromScreed: number;
  revealWidthLeft?: number | undefined;
  revealWidthRight?: number | undefined;
  isFrenchDoor?: boolean | undefined;
}

export interface CreateDoorData {
  width: number;
  heightFromScreed: number;
  revealLeft?: number | undefined;
  revealRight?: number | undefined;
  isFrenchDoor?: boolean | undefined;
}

export const openingsApi = {
  windows: {
    list: (wallId: string) => api.get<WindowOpening[]>(`/walls/${wallId}/windows`),
    create: (wallId: string, data: CreateWindowData) =>
      api.post<WindowOpening>(`/walls/${wallId}/windows`, data),
    update: (wallId: string, windowId: string, data: Partial<CreateWindowData>) =>
      api.patch<WindowOpening>(`/walls/${wallId}/windows/${windowId}`, data),
    remove: (wallId: string, windowId: string) =>
      api.delete<void>(`/walls/${wallId}/windows/${windowId}`),
  },

  doors: {
    list: (wallId: string) => api.get<DoorOpening[]>(`/walls/${wallId}/doors`),
    create: (wallId: string, data: CreateDoorData) =>
      api.post<DoorOpening>(`/walls/${wallId}/doors`, data),
    update: (wallId: string, doorId: string, data: Partial<CreateDoorData>) =>
      api.patch<DoorOpening>(`/walls/${wallId}/doors/${doorId}`, data),
    remove: (wallId: string, doorId: string) =>
      api.delete<void>(`/walls/${wallId}/doors/${doorId}`),
  },
};
