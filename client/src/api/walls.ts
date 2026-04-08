import { api } from './client';
import type { Wall, WallMaterial, WallType } from '../types/api';

export interface CreateWallData {
  cornerFrom: string;
  cornerTo: string;
  length: number;
  sortOrder: number;
  label?: string | undefined;
  material?: WallMaterial | undefined;
  wallType?: WallType | undefined;
  curvatureBottom?: number | undefined;
  curvatureMiddle?: number | undefined;
  curvatureTop?: number | undefined;
}

export const wallsApi = {
  list: (roomId: string) => api.get<Wall[]>(`/rooms/${roomId}/walls`),

  get: (roomId: string, wallId: string) =>
    api.get<Wall>(`/rooms/${roomId}/walls/${wallId}`),

  create: (roomId: string, data: CreateWallData) =>
    api.post<Wall>(`/rooms/${roomId}/walls`, data),

  update: (wallId: string, data: Partial<CreateWallData>) =>
    api.patch<Wall>(`/walls/${wallId}`, data),

  remove: (wallId: string) => api.delete<void>(`/walls/${wallId}`),
};
