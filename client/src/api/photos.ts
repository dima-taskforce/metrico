import { api } from './client';
import type { Photo, PhotoType } from '../types/api';

export const photosApi = {
  list: (roomId: string) => api.get<Photo[]>(`/rooms/${roomId}/photos`),

  upload: (roomId: string, file: File, photoType: PhotoType) => {
    const form = new FormData();
    form.append('file', file);
    form.append('photoType', photoType);
    return fetch(`/api/rooms/${roomId}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error((err as { message: string }).message ?? 'Upload failed');
      }
      return res.json() as Promise<Photo>;
    });
  },

  remove: (photoId: string) => api.delete<void>(`/photos/${photoId}`),
};
