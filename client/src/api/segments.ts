import { api } from './client';
import type { WallSegment, ValidateSegmentsResult, SegmentType } from '../types/api';

export interface CreateSegmentData {
  segmentType: SegmentType;
  length: number;
  sortOrder: number;
  depth?: number;
  windowOpeningId?: string;
  doorOpeningId?: string;
  description?: string;
}

export const segmentsApi = {
  list: (wallId: string) => api.get<WallSegment[]>(`/walls/${wallId}/segments`),

  create: (wallId: string, data: CreateSegmentData) =>
    api.post<WallSegment>(`/walls/${wallId}/segments`, data),

  update: (segmentId: string, data: Partial<Omit<CreateSegmentData, 'segmentType'>>) =>
    api.patch<WallSegment>(`/segments/${segmentId}`, data),

  remove: (segmentId: string) => api.delete<void>(`/segments/${segmentId}`),

  validate: (wallId: string) =>
    api.get<ValidateSegmentsResult>(`/walls/${wallId}/segments/validate`),
};
