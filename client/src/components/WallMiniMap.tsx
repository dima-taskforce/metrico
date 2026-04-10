import type { RoomShape } from '../types/api';

type OrientationKey = `${RoomShape}_${0 | 1 | 2 | 3}`;

interface ShapeMeta {
  viewBox: string;
  outline: string;
  corners: Record<string, [number, number]>;
}

// Coordinates exactly match CornerLabelStep SHAPE_VARIANTS
const SHAPE_META: Record<string, ShapeMeta> = {
  RECTANGLE_0: {
    viewBox: '0 0 126 92',
    outline: '14,72 14,12 110,12 110,72',
    corners: { A: [14, 72], B: [14, 12], C: [110, 12], D: [110, 72] },
  },
  RECTANGLE_1: {
    viewBox: '0 0 126 92',
    outline: '14,72 14,12 110,12 110,72',
    corners: { A: [14, 72], B: [14, 12], C: [110, 12], D: [110, 72] },
  },
  RECTANGLE_2: {
    viewBox: '0 0 126 92',
    outline: '14,72 14,12 110,12 110,72',
    corners: { A: [14, 72], B: [14, 12], C: [110, 12], D: [110, 72] },
  },
  RECTANGLE_3: {
    viewBox: '0 0 126 92',
    outline: '14,72 14,12 110,12 110,72',
    corners: { A: [14, 72], B: [14, 12], C: [110, 12], D: [110, 72] },
  },

  // L_SHAPE orientation 0: notch top-right
  L_SHAPE_0: {
    viewBox: '0 0 126 112',
    outline: '12,100 12,10 72,10 72,50 112,50 112,100',
    corners: { A: [12, 100], B: [12, 10], C: [72, 10], D: [72, 50], E: [112, 50], F: [112, 100] },
  },
  // L_SHAPE orientation 1: notch bottom-right
  L_SHAPE_1: {
    viewBox: '0 0 126 112',
    outline: '14,100 14,11 115,11 115,64 70,64 70,100',
    corners: { A: [14, 100], B: [14, 11], C: [115, 11], D: [115, 64], E: [70, 64], F: [70, 100] },
  },
  // L_SHAPE orientation 2: notch bottom-left
  L_SHAPE_2: {
    viewBox: '0 0 126 112',
    outline: '14,62 14,12 114,12 114,102 54,102 54,62',
    corners: { A: [54, 102], B: [54, 62], C: [14, 62], D: [14, 12], E: [114, 12], F: [114, 102] },
  },
  // L_SHAPE orientation 3: notch top-left
  L_SHAPE_3: {
    viewBox: '0 0 126 112',
    outline: '11,101 11,48 56,48 56,12 112,12 112,101',
    corners: { A: [11, 101], B: [11, 48], C: [56, 48], D: [56, 12], E: [112, 12], F: [112, 101] },
  },

  // U_SHAPE orientation 0: opening bottom
  U_SHAPE_0: {
    viewBox: '0 0 148 106',
    outline: '10,90 10,10 130,10 130,90 100,90 100,40 40,40 40,90',
    corners: { A: [10, 90], B: [10, 10], C: [130, 10], D: [130, 90], E: [100, 90], F: [100, 40], G: [40, 40], H: [40, 90] },
  },
  // U_SHAPE orientation 1: opening right
  U_SHAPE_1: {
    viewBox: '0 0 148 106',
    outline: '22,93 22,72 92,72 92,29 22,29 22,7 134,7 134,93',
    corners: { A: [22, 93], B: [22, 72], C: [92, 72], D: [92, 29], E: [22, 29], F: [22, 7], G: [134, 7], H: [134, 93] },
  },
  // U_SHAPE orientation 2: opening top
  U_SHAPE_2: {
    viewBox: '0 0 148 106',
    outline: '18,96 18,16 48,16 48,66 108,66 108,16 138,16 138,96',
    corners: { A: [18, 96], B: [18, 16], C: [48, 16], D: [48, 66], E: [108, 66], F: [108, 16], G: [138, 16], H: [138, 96] },
  },
  // U_SHAPE orientation 3: opening left
  U_SHAPE_3: {
    viewBox: '0 0 148 106',
    outline: '14,99 14,13 126,13 126,34 56,34 56,77 126,77 126,99',
    corners: { A: [14, 99], B: [14, 13], C: [126, 13], D: [126, 34], E: [56, 34], F: [56, 77], G: [126, 77], H: [126, 99] },
  },

  // T_SHAPE orientation 0: stem top
  T_SHAPE_0: {
    viewBox: '0 0 148 106',
    outline: '10,90 10,50 45,50 45,10 95,10 95,50 130,50 130,90',
    corners: { A: [10, 90], B: [10, 50], C: [45, 50], D: [45, 10], E: [95, 10], F: [95, 50], G: [130, 50], H: [130, 90] },
  },
  // T_SHAPE orientation 1: stem right
  T_SHAPE_1: {
    viewBox: '0 0 148 106',
    outline: '22,93 78,93 78,68 134,68 134,32 78,32 78,7 22,7',
    corners: { A: [22, 93], B: [22, 7], C: [78, 7], D: [78, 32], E: [134, 32], F: [134, 68], G: [78, 68], H: [78, 93] },
  },
  // T_SHAPE orientation 2: stem bottom
  T_SHAPE_2: {
    viewBox: '0 0 148 106',
    outline: '18,56 53,56 53,96 103,96 103,56 138,56 138,16 18,16',
    corners: { A: [53, 96], B: [53, 56], C: [18, 56], D: [18, 16], E: [138, 16], F: [138, 56], G: [103, 56], H: [103, 96] },
  },
  // T_SHAPE orientation 3: stem left
  T_SHAPE_3: {
    viewBox: '0 0 148 106',
    outline: '14,74 14,38 70,38 70,13 126,13 126,99 70,99 70,74',
    corners: { A: [70, 99], B: [70, 74], C: [14, 74], D: [14, 38], E: [70, 38], F: [70, 13], G: [126, 13], H: [126, 99] },
  },

  // CUSTOM — same for all orientations
  CUSTOM_0: {
    viewBox: '0 0 126 92',
    outline: '12,72 12,10 82,10 112,40 112,72',
    corners: { A: [12, 72], B: [12, 10], C: [82, 10], D: [112, 40], E: [112, 72] },
  },
  CUSTOM_1: {
    viewBox: '0 0 126 92',
    outline: '12,72 12,10 82,10 112,40 112,72',
    corners: { A: [12, 72], B: [12, 10], C: [82, 10], D: [112, 40], E: [112, 72] },
  },
  CUSTOM_2: {
    viewBox: '0 0 126 92',
    outline: '12,72 12,10 82,10 112,40 112,72',
    corners: { A: [12, 72], B: [12, 10], C: [82, 10], D: [112, 40], E: [112, 72] },
  },
  CUSTOM_3: {
    viewBox: '0 0 126 92',
    outline: '12,72 12,10 82,10 112,40 112,72',
    corners: { A: [12, 72], B: [12, 10], C: [82, 10], D: [112, 40], E: [112, 72] },
  },
};

function getKey(shape: RoomShape, orientation: 0 | 1 | 2 | 3): OrientationKey {
  return `${shape}_${orientation}` as OrientationKey;
}

interface WallMiniMapProps {
  shape: RoomShape;
  orientation: 0 | 1 | 2 | 3;
  cornerFrom: string;
  cornerTo: string;
}

export function WallMiniMap({ shape, orientation, cornerFrom, cornerTo }: WallMiniMapProps) {
  const key = getKey(shape, orientation);
  const meta = SHAPE_META[key] ?? SHAPE_META['RECTANGLE_0']!;

  const fromCoord = meta.corners[cornerFrom];
  const toCoord = meta.corners[cornerTo];

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg viewBox={meta.viewBox} className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
        {/* Room outline */}
        <polygon
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
