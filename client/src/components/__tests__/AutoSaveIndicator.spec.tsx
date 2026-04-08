import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AutoSaveIndicator } from '../AutoSaveIndicator';

describe('AutoSaveIndicator', () => {
  it('renders nothing when status is idle', () => {
    const { container } = render(
      <AutoSaveIndicator status="idle" lastSavedAt={null} error={null} />,
    );
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('displays saving text with spinner icon', () => {
    render(
      <AutoSaveIndicator status="saving" lastSavedAt={null} error={null} />,
    );
    expect(screen.getByText('Сохранение…')).toBeInTheDocument();
  });

  it('displays saved text when save completes', () => {
    const now = new Date();
    render(
      <AutoSaveIndicator status="saved" lastSavedAt={now} error={null} />,
    );
    expect(screen.getByText('Сохранено')).toBeInTheDocument();
  });

  it('displays error message on save failure', () => {
    render(
      <AutoSaveIndicator
        status="error"
        lastSavedAt={null}
        error="Network timeout"
      />,
    );
    expect(screen.getByText(/Network timeout/)).toBeInTheDocument();
  });

  it('displays default error message when none provided', () => {
    render(
      <AutoSaveIndicator
        status="error"
        lastSavedAt={null}
        error={null}
      />,
    );
    expect(screen.getByText('Ошибка сохранения')).toBeInTheDocument();
  });

  it('applies correct color classes for each status', () => {
    const { container: savingContainer } = render(
      <AutoSaveIndicator status="saving" lastSavedAt={null} error={null} />,
    );
    expect(savingContainer.firstChild).toHaveClass('text-blue-600');

    const { container: savedContainer } = render(
      <AutoSaveIndicator status="saved" lastSavedAt={new Date()} error={null} />,
    );
    expect(savedContainer.firstChild).toHaveClass('text-green-600');

    const { container: errorContainer } = render(
      <AutoSaveIndicator
        status="error"
        lastSavedAt={null}
        error="Test error"
      />,
    );
    expect(errorContainer.firstChild).toHaveClass('text-red-600');
  });

  it('renders SVG icons for each status', () => {
    const { container: savingContainer } = render(
      <AutoSaveIndicator status="saving" lastSavedAt={null} error={null} />,
    );
    const savingSvg = savingContainer.querySelector('svg.animate-spin');
    expect(savingSvg).toBeInTheDocument();

    const { container: savedContainer } = render(
      <AutoSaveIndicator status="saved" lastSavedAt={new Date()} error={null} />,
    );
    const savedSvg = savedContainer.querySelector('svg:not(.animate-spin)');
    expect(savedSvg).toBeInTheDocument();

    const { container: errorContainer } = render(
      <AutoSaveIndicator
        status="error"
        lastSavedAt={null}
        error="Test error"
      />,
    );
    const errorSvg = errorContainer.querySelector('svg:not(.animate-spin)');
    expect(errorSvg).toBeInTheDocument();
  });

  it('accepts custom className prop', () => {
    const { container } = render(
      <AutoSaveIndicator
        status="saving"
        lastSavedAt={null}
        error={null}
        className="custom-class"
      />,
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
