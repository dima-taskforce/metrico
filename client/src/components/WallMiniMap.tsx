import type { RoomShape } from '../types/api';

// Corner pixel coordinates per shape (matches CornerLabelStep SVGs)
const SHAPE_META: Record<
  RoomShape,
  { viewBox: string; outline: string; tag: 'polygon' | 'polyline'; corners: Record<string, [number, number]> }
> = {
  RECTANGLE: {
    viewBox: '0 0 126 92',
    outline: '14,72 14,12 110,12 110,72',
    tag: 'polygon',
    corners: { A: [14, 72], B: [14, 12], C: [110, 12], D: [110, 72] },
  },
  L_SHAPE: {
    viewBox: '0 0 126 112',
    outline: '12,100 12,10 72,10 72,50 112,50 112,100',
    tag: 'polyline',
    corners: { A: [12, 100], B: [12, 10], C: [72, 10], D: [72, 50], E: [112, 50], F: [112, 100] },
  },
  U_SHAPE: {
    viewBox: '0 0 148 106',
    outline: '10,90 10,10 130,10 130,90 100,90 100,40 40,40 40,90',
    tag: 'polygon',
    corners: { A: [10, 90], B: [10, 10], C: [130, 10], D: [130, 90], E: [100, 90], F: [100, 40], G: [40, 40], H: [40, 90] },
  },
  T_SHAPE: {
    viewBox: '0 0 148 106',
    outline: '10,90 10,50 45,50 45,10 95,10 95,50 130,50 130,90',
    tag: 'polygon',
    corners: { A: [10, 90], B: [10, 50], C: [45, 50], D: [45, 10], E: [95, 10], F: [95, 50], G: [130, 50], H: [130, 90] },
  },
  CUSTOM: {
    viewBox: '0 0 126 92',
    outline: '12,72 12,10 82,10 112,40 112,72',
    tag: 'polygon',
    corners: { A: [12, 72], B: [12, 10], C: [82, 10], D: [112, 40], E: [112, 72] },
  },
};

interface WallMiniMapProps {
  shape: RoomShape;
  orientation: 0 | 1 | 2 | 3;
  cornerFrom: string;
  cornerTo: string;
}

const ROTATION_DEG: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 90, 2: 180, 3: 270 };

export function WallMiniMap({ shape, orientation, cornerFrom, cornerTo }: WallMiniMapProps) {
  const meta = SHAPE_META[shape];
  const rotateDeg = ROTATION_DEG[orientation];

  const fromCoord = meta.corners[cornerFrom];
  const toCoord = meta.corners[cornerTo];

  const ShapeEl = meta.tag;

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ transform: `rotate(${rotateDeg}deg)`, transition: 'transform 0.2s' }}
    >
      <svg viewBox={meta.viewBox} className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
        {/* Room outline */}
        <ShapeEl
          points={meta.outline}
          className="text-primary-200"
          strokeWidth="1.5"
        />

        {/* All corner dots (inactive) */}
        {Object.entries(meta.corners).map(([letter, [cx, cy]]) => (
          <circle
            key={letter}
            cx={cx}
            cy={cy}
            r="2.5"
            className="fill-gray-300"
            stroke="none"
          />
        ))}

        {/* Active wall highlight */}
        {fromCoord && toCoord && (
          <>
            <line
              x1={fromCoord[0]}
              y1={fromCoord[1]}
              x2={toCoord[0]}
              y2={toCoord[1]}
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx={fromCoord[0]} cy={fromCoord[1]} r="4" fill="#2563eb" stroke="none" />
            <circle cx={toCoord[0]} cy={toCoord[1]} r="4" fill="#2563eb" stroke="none" />
          </>
        )}
      </svg>
    </div>
  );
}
