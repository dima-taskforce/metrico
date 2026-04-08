import { api } from './client';
import type { Project } from '../types/api';

export interface CreateProjectData {
  name: string;
  objectType: Project['objectType'];
  address?: string | undefined;
  defaultCeilingHeight?: number | undefined;
}

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),

  get: (id: string) => api.get<Project>(`/projects/${id}`),

  create: (data: CreateProjectData) => api.post<Project>('/projects', data),

  update: (id: string, data: Partial<CreateProjectData & { status: Project['status'] }>) =>
    api.patch<Project>(`/projects/${id}`, data),

  delete: (id: string) => api.delete<void>(`/projects/${id}`),

  duplicate: (id: string) => api.post<Project>(`/projects/${id}/duplicate`),

  reopen: (id: string) => api.patch<Project>(`/projects/${id}/reopen`, {}),

  uploadBlueprint: (id: string, file: File) =>
    api.upload<Project>(`/projects/${id}/blueprint`, file),
};
