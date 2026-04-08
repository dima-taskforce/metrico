import { api } from './client';
import type { FloorPlanRoom, FloorPlanAdjacency, GetPlanDto } from '../types/api';

export interface CreateAdjacencyPayload {
  wallAId: string;
  wallBId: string;
  hasDoorBetween: boolean;
  doorOpeningId?: string;
}

export interface FloorPlanLayout {
  layoutJson: string;
}

export const planApi = {
  getFloorPlan: (projectId: string) =>
    api.get<GetPlanDto>(`/projects/${projectId}/plan`),

  createAdjacency: (projectId: string, payload: CreateAdjacencyPayload) =>
    api.post<FloorPlanAdjacency>(`/projects/${projectId}/adjacencies`, payload),

  getAdjacencies: (projectId: string) =>
    api.get<FloorPlanAdjacency[]>(`/projects/${projectId}/adjacencies`),

  deleteAdjacency: (projectId: string, adjacencyId: string) =>
    api.delete<void>(`/projects/${projectId}/adjacencies/${adjacencyId}`),

  saveFloorPlanLayout: (projectId: string, layoutJson: string) =>
    api.patch<{ id: string; projectId: string }>(
      `/projects/${projectId}/plan`,
      { layoutJson }
    ),

  deleteFloorPlanLayout: (projectId: string) =>
    api.delete<void>(`/projects/${projectId}/plan`),
};
