import { api } from './client';
import type { User } from '../types/api';

interface AuthResponse {
  message: string;
}

export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  logout: () => api.post<AuthResponse>('/auth/logout'),

  me: () => api.post<User>('/auth/me'),
};
