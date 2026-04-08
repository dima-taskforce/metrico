import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  PlanLegend,
  ElectricalPanelIcon,
  LowVoltagePanelIcon,
  RadiatorIcon,
  VentShaftIcon,
  PipeIcon,
  DoorOpeningIcon,
  WindowOpeningIcon,
  ColumnIcon,
} from '../PlanLegend';

describe('PlanLegend', () => {
  it('renders with correct aria-label', () => {
    render(<PlanLegend />);
    expect(screen.getByRole('complementary', { name: 'Условные обозначения' })).toBeInTheDocument();
  });

  it('renders heading', () => {
    render(<PlanLegend />);
    expect(screen.getByText('Условные обозначения')).toBeInTheDocument();
  });

  it('shows all 8 legend labels', () => {
    render(<PlanLegend />);
    expect(screen.getByText('Электрощит')).toBeInTheDocument();
    expect(screen.getByText('Слаботочный щит')).toBeInTheDocument();
    expect(screen.getByText('Радиатор')).toBeInTheDocument();
    expect(screen.getByText('Вент-шахта')).toBeInTheDocument();
    expect(screen.getByText('Труба/стояк')).toBeInTheDocument();
    expect(screen.getByText('Колонна')).toBeInTheDocument();
    expect(screen.getByText('Дверной проём')).toBeInTheDocument();
    expect(screen.getByText('Оконный проём')).toBeInTheDocument();
  });

  it('renders 8 list items', () => {
    render(<PlanLegend />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(8);
  });

  it('accepts className prop', () => {
    const { container } = render(<PlanLegend className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('SVG icon components', () => {
  it('ElectricalPanelIcon renders svg', () => {
    const { container } = render(<ElectricalPanelIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('LowVoltagePanelIcon renders svg', () => {
    const { container } = render(<LowVoltagePanelIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('RadiatorIcon renders svg', () => {
    const { container } = render(<RadiatorIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('VentShaftIcon renders svg', () => {
    const { container } = render(<VentShaftIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('PipeIcon renders svg', () => {
    const { container } = render(<PipeIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('DoorOpeningIcon renders svg', () => {
    const { container } = render(<DoorOpeningIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('WindowOpeningIcon renders svg', () => {
    const { container } = render(<WindowOpeningIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('ColumnIcon renders svg', () => {
    const { container } = render(<ColumnIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('icon size prop sets width and height', () => {
    const { container } = render(<ElectricalPanelIcon size={32} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });
});
