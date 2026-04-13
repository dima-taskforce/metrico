import { api } from './client';
import type { SketchData } from '../types/sketch';

export const sketchApi = {
  get: async (projectId: string): Promise<SketchData | null> => {
    const raw = await api.get<string | SketchData | null>(`/projects/${projectId}/sketch`);
    if (!raw) return null;
    if (typeof raw === 'string') return JSON.parse(raw) as SketchData;
    return raw as SketchData;
  },

  save: (projectId: string, sketchJson: string) =>
    api.put<{ id: string }>(`/projects/${projectId}/sketch`, { sketchJson }),

  delete: (projectId: string) =>
    api.delete<void>(`/projects/${projectId}/sketch`),
};
