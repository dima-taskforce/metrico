import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';

describe('useAutoSave', () => {
  let mockApiCall: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockApiCall = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with idle status', () => {
    const { result } = renderHook(() => useAutoSave({ count: 0 }, mockApiCall));

    expect(result.current.status).toBe('idle');
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('calls API after debounce delay', async () => {
    const { rerender } = renderHook(
      ({ data }) => useAutoSave(data, mockApiCall, { debounceMs: 100 }),
      { initialProps: { data: { count: 0 } } },
    );

    rerender({ data: { count: 1 } });

    expect(mockApiCall).not.toHaveBeenCalled();

    await waitFor(
      () => {
        expect(mockApiCall).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );
  });

  it('sets status to saved after successful API call', async () => {
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, mockApiCall, { debounceMs: 50 }),
      { initialProps: { data: { count: 0 } } },
    );

    rerender({ data: { count: 1 } });

    await waitFor(
      () => {
        expect(result.current.status).toBe('saved');
      },
      { timeout: 1000 },
    );
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  it('sets error status on API failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Save failed'));

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, mockApiCall, { debounceMs: 50, maxRetries: 0 }),
      { initialProps: { data: { count: 0 } } },
    );

    rerender({ data: { count: 1 } });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 1000 },
    );
    expect(result.current.error).toContain('Save failed');
  });

  it('detects offline status', async () => {
    const originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, mockApiCall, { debounceMs: 50 }),
      { initialProps: { data: { count: 0 } } },
    );

    rerender({ data: { count: 1 } });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
      },
      { timeout: 1000 },
    );
    expect(result.current.error).toContain('Интернет');
    expect(mockApiCall).not.toHaveBeenCalled();

    // Restore original onLine property
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine);
    }
  });

});
