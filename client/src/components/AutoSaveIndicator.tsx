import { useMemo } from 'react';

interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
  error: string | null;
  className?: string;
}

export function AutoSaveIndicator({
  status,
  lastSavedAt,
  error,
  className = '',
}: AutoSaveIndicatorProps) {
  const displayText = useMemo(() => {
    if (status === 'saving') {
      return 'Сохранение…';
    }
    if (status === 'error') {
      return error || 'Ошибка сохранения';
    }
    if (status === 'saved' && lastSavedAt) {
      const now = new Date();
      const diffMs = now.getTime() - lastSavedAt.getTime();
      const diffSec = Math.floor(diffMs / 1000);

      if (diffSec < 60) {
        return 'Сохранено';
      }
      const diffMin = Math.floor(diffSec / 60);
      return `Сохранено ${diffMin}м назад`;
    }
    return '';
  }, [status, lastSavedAt, error]);

  const statusIcon = useMemo(() => {
    switch (status) {
      case 'saving':
        return (
          <svg
            className="w-4 h-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      case 'saved':
        return (
          <svg
            className="w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'error':
        return (
          <svg
            className="w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  }, [status]);

  const colorClasses = {
    saving: 'text-blue-600',
    saved: 'text-green-600',
    error: 'text-red-600',
    idle: 'text-gray-400',
  };

  return (
    <div className={`flex items-center gap-2 text-xs ${colorClasses[status]} ${className}`}>
      {statusIcon && <div>{statusIcon}</div>}
      {displayText && <span>{displayText}</span>}
    </div>
  );
}
