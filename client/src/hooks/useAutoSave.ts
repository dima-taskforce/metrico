import { useEffect, useRef, useState, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveState {
  status: SaveStatus;
  lastSavedAt: Date | null;
  error: string | null;
}

interface UseAutoSaveOptions {
  debounceMs?: number;
  maxRetries?: number;
}

/**
 * Hook for auto-saving data with debounce, offline detection, and retry logic.
 * @param data The data to auto-save
 * @param apiCall Function that saves data (must return Promise)
 * @param options Optional debounce and retry settings
 * @returns Current save status, lastSavedAt timestamp, and error message
 */
export function useAutoSave<T>(
  data: T,
  apiCall: (data: T) => Promise<void>,
  options: UseAutoSaveOptions = {},
): UseAutoSaveState {
  const { debounceMs = 2000, maxRetries = 3 } = options;

  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const dataRef = useRef(data);

  // Update data ref on data change
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const performSave = useCallback(
    async (retryCount = 0): Promise<void> => {
      // Check if online
      if (!navigator.onLine) {
        setStatus('error');
        setError('Интернет отключён. Сохранение будет повторено при подключении.');
        return;
      }

      try {
        setStatus('saving');
        setError(null);
        await apiCall(dataRef.current);
        setStatus('saved');
        setLastSavedAt(new Date());
        retryCountRef.current = 0;

        // Auto-reset to idle after 2 seconds
        const resetTimeout = setTimeout(() => {
          setStatus('idle');
        }, 2000);

        return () => clearTimeout(resetTimeout);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ошибка сохранения';

        if (retryCount < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const backoffMs = Math.pow(2, retryCount) * 1000;
          const retryTimeout = setTimeout(() => {
            retryCountRef.current = retryCount + 1;
            performSave(retryCount + 1);
          }, backoffMs);

          return () => clearTimeout(retryTimeout);
        } else {
          setStatus('error');
          setError(`${errorMessage} (попытка ${retryCount}/${maxRetries})`);
          retryCountRef.current = 0;
        }
      }
    },
    [apiCall, maxRetries],
  );

  // Debounced auto-save on data change
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new debounce timeout
    debounceTimeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [data, debounceMs, performSave]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      // Trigger save when coming back online if there's pending work
      if (status === 'error') {
        performSave();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [status, performSave]);

  return { status, lastSavedAt, error };
}
