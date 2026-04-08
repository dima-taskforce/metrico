import { api } from './client';
import type { Room, RoomType, RoomShape } from '../types/api';

export interface CreateRoomData {
  name: string;
  type: RoomType;
  shape: RoomShape;
  ceilingHeight1?: number | undefined;
  ceilingHeight2?: number | undefined;
  sortOrder?: number | undefined;
}

export const roomsApi = {
  list: (projectId: string) => api.get<Room[]>(`/projects/${projectId}/rooms`),

  get: (projectId: string, roomId: string) =>
    api.get<Room>(`/projects/${projectId}/rooms/${roomId}`),

  create: (projectId: string, data: CreateRoomData) =>
    api.post<Room>(`/projects/${projectId}/rooms`, data),

  update: (projectId: string, roomId: string, data: Partial<CreateRoomData & { isMeasured: boolean }>) =>
    api.patch<Room>(`/projects/${projectId}/rooms/${roomId}`, data),

  remove: (projectId: string, roomId: string) =>
    api.delete<void>(`/projects/${projectId}/rooms/${roomId}`),

  reorder: (projectId: string, ids: string[]) =>
    api.post<void>(`/projects/${projectId}/rooms/reorder`, { ids }),
};
