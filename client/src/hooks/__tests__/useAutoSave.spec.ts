import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';

describe('useAutoSave', () => {
  let mockApiCall: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockApiCall = vi.fn().mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with idle status', () => {
    const { result } = renderHook(() => useAutoSave({ count: 0 }, mockApiCall));

    expect(result.current.status).toBe('idle');
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('calls API after debounce delay', async () => {
    const { rerender } = renderHook(
      ({ data }) => useAutoSave(data, mockApiCall, { debounceMs: 500 }),
      { initialProps: { data: { count: 0 } } },
    );

    rerender({ data: { count: 1 } });

    expect(mockApiCall).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith({ count: 1 });
    });
  });

  it('sets status to saved after successful API call', async () => {
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, mockApiCall, { debounceMs: 100 }),
      { initialProps: { data: { count: 0 } } },
    );

    rerender({ data: { count: 1 } });
    vi.advanceTimersByTime(100);

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  it('sets error status on API failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Save failed'));

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, mockApiCall, { debounceMs: 100, maxRetries: 0 }),
      { initialProps: { data: { count: 0 } } },
    );

    rerender({ data: { count: 1 } });
    vi.advanceTimersByTime(100);

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('Save failed');
    });
  });

  it('retries with exponential backoff on failure', async () => {
    mockApiCall
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce(undefined);

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, mockApiCall, { debounceMs: 100, maxRetries: 2 }),
      { initialProps: { data: { count: 0 } } },
    );

    rerender({ data: { count: 1 } });
    vi.advanceTimersByTime(100);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    // First retry after 1s (2^0 * 1000)
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(2);
      expect(result.current.status).toBe('saved');
    });
  });

  it('detects offline status', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, mockApiCall, { debounceMs: 100 }),
      { initialProps: { data: { count: 0 } } },
    );

    rerender({ data: { count: 1 } });
    vi.advanceTimersByTime(100);

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('Интернет');
    });

    expect(mockApiCall).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('debounces multiple rapid changes', async () => {
    const { rerender } = renderHook(
      ({ data }) => useAutoSave(data, mockApiCall, { debounceMs: 300 }),
      { initialProps: { data: { count: 0 } } },
    );

    rerender({ data: { count: 1 } });
    vi.advanceTimersByTime(100);
    rerender({ data: { count: 2 } });
    vi.advanceTimersByTime(100);
    rerender({ data: { count: 3 } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(mockApiCall).toHaveBeenCalledWith({ count: 3 });
    });
  });

  it('resets status to idle after save completes', async () => {
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, mockApiCall, { debounceMs: 100 }),
      { initialProps: { data: { count: 0 } } },
    );

    rerender({ data: { count: 1 } });
    vi.advanceTimersByTime(100);

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });
  });
});
