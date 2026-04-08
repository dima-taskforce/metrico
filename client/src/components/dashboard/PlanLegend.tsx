/** SVG icons reusable in canvas legend and PDF */

interface IconProps {
  size?: number;
  className?: string;
}

export function ElectricalPanelIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="7" y1="7" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" />
      <line x1="17" y1="7" x2="7" y2="17" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function LowVoltagePanelIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="1.5" fill="none" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function RadiatorIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="7" y1="6" x2="7" y2="18" stroke="currentColor" strokeWidth="1" />
      <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="1" />
      <line x1="17" y1="6" x2="17" y2="18" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function VentShaftIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Hatching lines */}
      <line x1="3" y1="9" x2="9" y2="3" stroke="currentColor" strokeWidth="1" />
      <line x1="3" y1="15" x2="15" y2="3" stroke="currentColor" strokeWidth="1" />
      <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="1" />
      <line x1="9" y1="21" x2="21" y2="9" stroke="currentColor" strokeWidth="1" />
      <line x1="15" y1="21" x2="21" y2="15" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function PipeIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontFamily="sans-serif">D</text>
    </svg>
  );
}

export function DoorOpeningIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* Door leaf */}
      <line x1="4" y1="20" x2="4" y2="8" stroke="currentColor" strokeWidth="1.5" />
      {/* Door sweep arc */}
      <path d="M4 8 Q16 8 16 20" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
      {/* Opening width indicator */}
      <line x1="4" y1="20" x2="16" y2="20" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function WindowOpeningIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* Wall edges */}
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
      <line x1="3" y1="14" x2="21" y2="14" stroke="currentColor" strokeWidth="2" />
      {/* Glass lines */}
      <line x1="3" y1="11.5" x2="21" y2="11.5" stroke="currentColor" strokeWidth="0.75" />
      <line x1="3" y1="12.5" x2="21" y2="12.5" stroke="currentColor" strokeWidth="0.75" />
    </svg>
  );
}

export function ColumnIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

// ── Legend component ──────────────────────────────────────────────────────────

interface LegendItem {
  icon: React.ReactElement;
  label: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  { icon: <ElectricalPanelIcon size={20} />, label: 'Электрощит' },
  { icon: <LowVoltagePanelIcon size={20} />, label: 'Слаботочный щит' },
  { icon: <RadiatorIcon size={20} />, label: 'Радиатор' },
  { icon: <VentShaftIcon size={20} />, label: 'Вент-шахта' },
  { icon: <PipeIcon size={20} />, label: 'Труба/стояк' },
  { icon: <ColumnIcon size={20} />, label: 'Колонна' },
  { icon: <DoorOpeningIcon size={20} />, label: 'Дверной проём' },
  { icon: <WindowOpeningIcon size={20} />, label: 'Оконный проём' },
];

interface PlanLegendProps {
  className?: string;
}

export function PlanLegend({ className }: PlanLegendProps) {
  return (
    <aside
      aria-label="Условные обозначения"
      className={['bg-white border border-gray-200 rounded-lg p-3', className].filter(Boolean).join(' ')}
    >
      <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
        Условные обозначения
      </h3>
      <ul className="space-y-1.5">
        {LEGEND_ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs text-gray-700">
            <span className="shrink-0 text-gray-500">{item.icon}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
