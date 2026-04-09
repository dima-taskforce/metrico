import type { RoomShape } from '../../types/api';

export interface ShapeOption {
  shape: RoomShape;
  orientation: 0 | 1 | 2 | 3;
  label: string;
}

// 14 variants: 1 rect + 4 L + 4 U + 4 T + 1 custom
export const SHAPE_OPTIONS: ShapeOption[] = [
  { shape: 'RECTANGLE', orientation: 0, label: 'Прямоугольник' },
  { shape: 'L_SHAPE',   orientation: 0, label: 'Г-образная' },
  { shape: 'L_SHAPE',   orientation: 1, label: 'Г-образная ↻' },
  { shape: 'L_SHAPE',   orientation: 2, label: 'Г-образная ↻↻' },
  { shape: 'L_SHAPE',   orientation: 3, label: 'Г-образная ↺' },
  { shape: 'U_SHAPE',   orientation: 0, label: 'П-образная' },
  { shape: 'U_SHAPE',   orientation: 1, label: 'П-образная ↻' },
  { shape: 'U_SHAPE',   orientation: 2, label: 'П-образная ↻↻' },
  { shape: 'U_SHAPE',   orientation: 3, label: 'П-образная ↺' },
  { shape: 'T_SHAPE',   orientation: 0, label: 'Т-образная' },
  { shape: 'T_SHAPE',   orientation: 1, label: 'Т-образная ↻' },
  { shape: 'T_SHAPE',   orientation: 2, label: 'Т-образная ↻↻' },
  { shape: 'T_SHAPE',   orientation: 3, label: 'Т-образная ↺' },
  { shape: 'CUSTOM',    orientation: 0, label: 'Сложная' },
];

// Base SVG paths for each shape (orientation 0); CSS rotation handles other orientations
const BASE_SVG: Record<RoomShape, React.ReactNode> = {
  RECTANGLE: (
    <svg viewBox="0 0 40 30" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
      <rect x="4" y="4" width="32" height="22" />
    </svg>
  ),
  L_SHAPE: (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
      <polyline points="4,36 4,4 24,4 24,20 36,20 36,36 4,36" />
    </svg>
  ),
  U_SHAPE: (
    <svg viewBox="0 0 40 36" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
      <polygon points="4,4 4,36 14,36 14,18 26,18 26,36 36,36 36,4" />
    </svg>
  ),
  T_SHAPE: (
    <svg viewBox="0 0 40 36" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
      {/* Т-образная: широкое основание внизу, выступ вверх по центру */}
      <polygon points="4,36 4,20 14,20 14,4 26,4 26,20 36,20 36,36" />
    </svg>
  ),
  CUSTOM: (
    <svg viewBox="0 0 40 36" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
      <polygon points="4,32 4,4 26,4 36,16 36,32" />
    </svg>
  ),
};

const ROTATION_DEG: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 90, 2: 180, 3: 270 };

interface ShapePickerProps {
  value: RoomShape;
  orientation: 0 | 1 | 2 | 3;
  onChange: (shape: RoomShape, orientation: 0 | 1 | 2 | 3) => void;
}

export function ShapePicker({ value, orientation, onChange }: ShapePickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
      {SHAPE_OPTIONS.map((opt) => {
        const isSelected = opt.shape === value && opt.orientation === orientation;
        return (
          <button
            key={`${opt.shape}-${opt.orientation}`}
            type="button"
            onClick={() => onChange(opt.shape, opt.orientation)}
            title={opt.label}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors ${
              isSelected
                ? 'border-primary-500 bg-primary-50 text-primary-600'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div
              className="w-10 h-10 flex items-center justify-center"
              style={{ transform: `rotate(${ROTATION_DEG[opt.orientation]}deg)` }}
            >
              {BASE_SVG[opt.shape]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
