import type { ApiError } from '../types/api';

class ApiClient {
  private readonly baseUrl = '/api';

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (res.status === 401) {
      // Try to refresh the token once
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        const retry = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
          },
        });
        if (retry.ok) {
          return retry.json() as Promise<T>;
        }
      }
      // Refresh failed — clear auth state
      window.dispatchEvent(new CustomEvent('auth:logout'));
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const err = (await res.json().catch(() => ({ message: 'Request failed' }))) as ApiError;
      throw new Error(err.message ?? 'Request failed');
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    const init: RequestInit = { method: 'POST' };
    if (body !== undefined) init.body = JSON.stringify(body);
    return this.request<T>(path, init);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    const init: RequestInit = { method: 'PATCH' };
    if (body !== undefined) init.body = JSON.stringify(body);
    return this.request<T>(path, init);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async upload<T>(path: string, file: File, fieldName = 'file'): Promise<T> {
    const form = new FormData();
    form.append(fieldName, file);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ message: 'Upload failed' }))) as ApiError;
      throw new Error(err.message ?? 'Upload failed');
    }
    return res.json() as Promise<T>;
  }
}

export const api = new ApiClient();
