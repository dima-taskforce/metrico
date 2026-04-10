import { api } from './client';

export const sketchApi = {
  get: (projectId: string) =>
    api.get<string | null>(`/projects/${projectId}/sketch`),

  save: (projectId: string, sketchJson: string) =>
    api.put<{ id: string }>(`/projects/${projectId}/sketch`, { sketchJson }),

  delete: (projectId: string) =>
    api.delete<void>(`/projects/${projectId}/sketch`),
};
