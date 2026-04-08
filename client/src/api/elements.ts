import { api } from './client';
import type { RoomElement, ElementType } from '../types/api';

export interface CreateElementData {
  elementType: ElementType;
  wallId?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  depth?: number | undefined;
  offsetFromWall?: number | undefined;
  offsetFromFloor?: number | undefined;
  positionX?: number | undefined;
  cornerLabel?: string | undefined;
  description?: string | undefined;
}

export const elementsApi = {
  list: (roomId: string) => api.get<RoomElement[]>(`/rooms/${roomId}/elements`),

  create: (roomId: string, data: CreateElementData) =>
    api.post<RoomElement>(`/rooms/${roomId}/elements`, data),

  update: (elementId: string, data: Partial<CreateElementData>) =>
    api.patch<RoomElement>(`/elements/${elementId}`, data),

  remove: (elementId: string) => api.delete<void>(`/elements/${elementId}`),
};
