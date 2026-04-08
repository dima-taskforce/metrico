import { api } from './client';
import type { Angle } from '../types/api';

export interface CreateAngleData {
  cornerLabel: string;
  wallAId: string;
  wallBId: string;
  isRightAngle?: boolean;
  angleDegrees?: number;
}

export const anglesApi = {
  list: (roomId: string) => api.get<Angle[]>(`/rooms/${roomId}/angles`),

  create: (roomId: string, data: CreateAngleData) =>
    api.post<Angle>(`/rooms/${roomId}/angles`, data),

  update: (angleId: string, data: Partial<Omit<CreateAngleData, 'cornerLabel' | 'wallAId' | 'wallBId'>>) =>
    api.patch<Angle>(`/angles/${angleId}`, data),

  remove: (angleId: string) => api.delete<void>(`/angles/${angleId}`),
};
