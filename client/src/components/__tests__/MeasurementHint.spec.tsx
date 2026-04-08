import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeasurementHint } from '../MeasurementHint';

describe('MeasurementHint', () => {
  it('renders hint button for valid stepKey', () => {
    render(<MeasurementHint stepKey="wall-length" />);
    expect(screen.getByLabelText('Подсказка')).toBeInTheDocument();
  });

  it('does not render for invalid stepKey', () => {
    const { container } = render(<MeasurementHint stepKey="invalid-key" />);
    expect(container.firstChild).toBeNull();
  });

  it('opens tooltip on button click', async () => {
    render(<MeasurementHint stepKey="wall-length" />);
    const button = screen.getByLabelText('Подсказка');

    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Как измерить длину стены')).toBeInTheDocument();
    });
  });

  it('displays correct hint content', async () => {
    render(<MeasurementHint stepKey="wall-length" />);
    const button = screen.getByLabelText('Подсказка');

    await userEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Измерьте расстояние от угла до угла по полу рулеткой. Держите рулетку горизонтально и плотно к стене. Записывайте в миллиметрах (например, 3500 мм = 3.5 м).'
        )
      ).toBeInTheDocument();
    });
  });

  it('closes tooltip on close button click', async () => {
    render(<MeasurementHint stepKey="wall-length" />);
    const button = screen.getByLabelText('Подсказка');

    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Как измерить длину стены')).toBeInTheDocument();
    });

    const closeBtn = screen.getByLabelText('Закрыть');
    await userEvent.click(closeBtn);

    await waitFor(() => {
      expect(
        screen.queryByText('Как измерить длину стены')
      ).not.toBeInTheDocument();
    });
  });

  it('renders backdrop when tooltip is open', async () => {
    const { container } = render(<MeasurementHint stepKey="wall-length" />);
    const button = screen.getByLabelText('Подсказка');

    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Как измерить длину стены')).toBeInTheDocument();
    });

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
  });
});
