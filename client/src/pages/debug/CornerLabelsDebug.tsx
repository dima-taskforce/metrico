/**
 * Debug page — shows all room shape variants with labelled corners.
 * Route: /debug/corners
 * Purpose: visual verification that corner A is always the bottom-left vertex.
 */

interface CornerDef {
  label: string;
  cx: number;
  cy: number;
}

interface ShapeVariant {
  key: string;
  title: string;
  viewBox: string;
  polygon: string;
  corners: CornerDef[];
}

const DOT_R = 5;
const LABEL_OFFSET = 12;
const LABEL_MARGIN = 6;

function getLabelPosition(
  cx: number,
  cy: number,
  viewBox: string,
): { x: number; y: number } {
  const parts = viewBox.split(' ').map(Number);
  const vw = parts[2] ?? 126;
  const vh = parts[3] ?? 92;
  const midX = vw / 2;
  const midY = vh / 2;
  const rawX = cx + (cx < midX ? -LABEL_OFFSET : LABEL_OFFSET);
  const rawY = cy + (cy < midY ? -LABEL_OFFSET : LABEL_OFFSET);
  return {
    x: Math.max(LABEL_MARGIN, Math.min(vw - LABEL_MARGIN, rawX)),
    y: Math.max(LABEL_MARGIN, Math.min(vh - LABEL_MARGIN, rawY)),
  };
}

const ALL_VARIANTS: ShapeVariant[] = [
  // ── RECTANGLE ────────────────────────────────────────────────────────────
  {
    key: 'RECTANGLE_0',
    title: 'RECTANGLE 0',
    viewBox: '0 0 126 92',
    polygon: '14,72 14,12 110,12 110,72',
    corners: [
      { label: 'A', cx: 14, cy: 72 },
      { label: 'B', cx: 14, cy: 12 },
      { label: 'C', cx: 110, cy: 12 },
      { label: 'D', cx: 110, cy: 72 },
    ],
  },
  {
    key: 'RECTANGLE_1',
    title: 'RECTANGLE 1',
    viewBox: '0 0 126 92',
    polygon: '14,72 14,12 110,12 110,72',
    corners: [
      { label: 'A', cx: 14, cy: 72 },
      { label: 'B', cx: 14, cy: 12 },
      { label: 'C', cx: 110, cy: 12 },
      { label: 'D', cx: 110, cy: 72 },
    ],
  },
  {
    key: 'RECTANGLE_2',
    title: 'RECTANGLE 2',
    viewBox: '0 0 126 92',
    polygon: '14,72 14,12 110,12 110,72',
    corners: [
      { label: 'A', cx: 14, cy: 72 },
      { label: 'B', cx: 14, cy: 12 },
      { label: 'C', cx: 110, cy: 12 },
      { label: 'D', cx: 110, cy: 72 },
    ],
  },
  {
    key: 'RECTANGLE_3',
    title: 'RECTANGLE 3',
    viewBox: '0 0 126 92',
    polygon: '14,72 14,12 110,12 110,72',
    corners: [
      { label: 'A', cx: 14, cy: 72 },
      { label: 'B', cx: 14, cy: 12 },
      { label: 'C', cx: 110, cy: 12 },
      { label: 'D', cx: 110, cy: 72 },
    ],
  },

  // ── L_SHAPE ──────────────────────────────────────────────────────────────
  {
    key: 'L_SHAPE_0',
    title: 'L_SHAPE 0 (выемка сверху-справа)',
    viewBox: '0 0 126 112',
    polygon: '12,100 12,10 72,10 72,50 112,50 112,100',
    corners: [
      { label: 'A', cx: 12, cy: 100 },
      { label: 'B', cx: 12, cy: 10 },
      { label: 'C', cx: 72, cy: 10 },
      { label: 'D', cx: 72, cy: 50 },
      { label: 'E', cx: 112, cy: 50 },
      { label: 'F', cx: 112, cy: 100 },
    ],
  },
  {
    key: 'L_SHAPE_1',
    title: 'L_SHAPE 1 (выемка снизу-справа)',
    viewBox: '0 0 126 112',
    polygon: '14,100 14,11 115,11 115,64 70,64 70,100',
    corners: [
      { label: 'A', cx: 14, cy: 100 },
      { label: 'B', cx: 14, cy: 11 },
      { label: 'C', cx: 115, cy: 11 },
      { label: 'D', cx: 115, cy: 64 },
      { label: 'E', cx: 70, cy: 64 },
      { label: 'F', cx: 70, cy: 100 },
    ],
  },
  {
    key: 'L_SHAPE_2',
    title: 'L_SHAPE 2 (выемка снизу-слева)',
    viewBox: '0 0 126 112',
    polygon: '14,62 14,12 114,12 114,102 54,102 54,62',
    corners: [
      { label: 'A', cx: 54, cy: 102 },
      { label: 'B', cx: 54, cy: 62 },
      { label: 'C', cx: 14, cy: 62 },
      { label: 'D', cx: 14, cy: 12 },
      { label: 'E', cx: 114, cy: 12 },
      { label: 'F', cx: 114, cy: 102 },
    ],
  },
  {
    key: 'L_SHAPE_3',
    title: 'L_SHAPE 3 (выемка сверху-слева)',
    viewBox: '0 0 126 112',
    polygon: '11,101 11,48 56,48 56,12 112,12 112,101',
    corners: [
      { label: 'A', cx: 11, cy: 101 },
      { label: 'B', cx: 11, cy: 48 },
      { label: 'C', cx: 56, cy: 48 },
      { label: 'D', cx: 56, cy: 12 },
      { label: 'E', cx: 112, cy: 12 },
      { label: 'F', cx: 112, cy: 101 },
    ],
  },

  // ── U_SHAPE ──────────────────────────────────────────────────────────────
  {
    key: 'U_SHAPE_0',
    title: 'U_SHAPE 0 (открытие снизу)',
    viewBox: '0 0 148 106',
    polygon: '10,90 10,10 130,10 130,90 100,90 100,40 40,40 40,90',
    corners: [
      { label: 'A', cx: 10, cy: 90 },
      { label: 'B', cx: 10, cy: 10 },
      { label: 'C', cx: 130, cy: 10 },
      { label: 'D', cx: 130, cy: 90 },
      { label: 'E', cx: 100, cy: 90 },
      { label: 'F', cx: 100, cy: 40 },
      { label: 'G', cx: 40, cy: 40 },
      { label: 'H', cx: 40, cy: 90 },
    ],
  },
  {
    key: 'U_SHAPE_1',
    title: 'U_SHAPE 1 (открытие справа)',
    viewBox: '0 0 148 106',
    polygon: '22,93 22,72 92,72 92,29 22,29 22,7 134,7 134,93',
    corners: [
      { label: 'A', cx: 22, cy: 93 },
      { label: 'B', cx: 22, cy: 72 },
      { label: 'C', cx: 92, cy: 72 },
      { label: 'D', cx: 92, cy: 29 },
      { label: 'E', cx: 22, cy: 29 },
      { label: 'F', cx: 22, cy: 7 },
      { label: 'G', cx: 134, cy: 7 },
      { label: 'H', cx: 134, cy: 93 },
    ],
  },
  {
    key: 'U_SHAPE_2',
    title: 'U_SHAPE 2 (открытие сверху)',
    viewBox: '0 0 148 106',
    polygon: '18,96 18,16 48,16 48,66 108,66 108,16 138,16 138,96',
    corners: [
      { label: 'A', cx: 18, cy: 96 },
      { label: 'B', cx: 18, cy: 16 },
      { label: 'C', cx: 48, cy: 16 },
      { label: 'D', cx: 48, cy: 66 },
      { label: 'E', cx: 108, cy: 66 },
      { label: 'F', cx: 108, cy: 16 },
      { label: 'G', cx: 138, cy: 16 },
      { label: 'H', cx: 138, cy: 96 },
    ],
  },
  {
    key: 'U_SHAPE_3',
    title: 'U_SHAPE 3 (открытие слева)',
    viewBox: '0 0 148 106',
    polygon: '14,99 14,13 126,13 126,34 56,34 56,77 126,77 126,99',
    corners: [
      { label: 'A', cx: 14, cy: 99 },
      { label: 'B', cx: 14, cy: 13 },
      { label: 'C', cx: 126, cy: 13 },
      { label: 'D', cx: 126, cy: 34 },
      { label: 'E', cx: 56, cy: 34 },
      { label: 'F', cx: 56, cy: 77 },
      { label: 'G', cx: 126, cy: 77 },
      { label: 'H', cx: 126, cy: 99 },
    ],
  },

  // ── T_SHAPE ──────────────────────────────────────────────────────────────
  {
    key: 'T_SHAPE_0',
    title: 'T_SHAPE 0 (стебель сверху)',
    viewBox: '0 0 148 106',
    polygon: '10,90 10,50 45,50 45,10 95,10 95,50 130,50 130,90',
    corners: [
      { label: 'A', cx: 10, cy: 90 },
      { label: 'B', cx: 10, cy: 50 },
      { label: 'C', cx: 45, cy: 50 },
      { label: 'D', cx: 45, cy: 10 },
      { label: 'E', cx: 95, cy: 10 },
      { label: 'F', cx: 95, cy: 50 },
      { label: 'G', cx: 130, cy: 50 },
      { label: 'H', cx: 130, cy: 90 },
    ],
  },
  {
    key: 'T_SHAPE_1',
    title: 'T_SHAPE 1 (стебель справа)',
    viewBox: '0 0 148 106',
    polygon: '22,93 78,93 78,68 134,68 134,32 78,32 78,7 22,7',
    corners: [
      { label: 'A', cx: 22, cy: 93 },
      { label: 'B', cx: 22, cy: 7 },
      { label: 'C', cx: 78, cy: 7 },
      { label: 'D', cx: 78, cy: 32 },
      { label: 'E', cx: 134, cy: 32 },
      { label: 'F', cx: 134, cy: 68 },
      { label: 'G', cx: 78, cy: 68 },
      { label: 'H', cx: 78, cy: 93 },
    ],
  },
  {
    key: 'T_SHAPE_2',
    title: 'T_SHAPE 2 (стебель снизу)',
    viewBox: '0 0 148 106',
    polygon: '18,56 53,56 53,96 103,96 103,56 138,56 138,16 18,16',
    corners: [
      { label: 'A', cx: 53, cy: 96 },
      { label: 'B', cx: 53, cy: 56 },
      { label: 'C', cx: 18, cy: 56 },
      { label: 'D', cx: 18, cy: 16 },
      { label: 'E', cx: 138, cy: 16 },
      { label: 'F', cx: 138, cy: 56 },
      { label: 'G', cx: 103, cy: 56 },
      { label: 'H', cx: 103, cy: 96 },
    ],
  },
  {
    key: 'T_SHAPE_3',
    title: 'T_SHAPE 3 (стебель слева)',
    viewBox: '0 0 148 106',
    polygon: '14,74 14,38 70,38 70,13 126,13 126,99 70,99 70,74',
    corners: [
      { label: 'A', cx: 70, cy: 99 },
      { label: 'B', cx: 70, cy: 74 },
      { label: 'C', cx: 14, cy: 74 },
      { label: 'D', cx: 14, cy: 38 },
      { label: 'E', cx: 70, cy: 38 },
      { label: 'F', cx: 70, cy: 13 },
      { label: 'G', cx: 126, cy: 13 },
      { label: 'H', cx: 126, cy: 99 },
    ],
  },

  // ── CUSTOM ───────────────────────────────────────────────────────────────
  {
    key: 'CUSTOM_0',
    title: 'CUSTOM 0',
    viewBox: '0 0 126 92',
    polygon: '12,72 12,10 82,10 112,40 112,72',
    corners: [
      { label: 'A', cx: 12, cy: 72 },
      { label: 'B', cx: 12, cy: 10 },
      { label: 'C', cx: 82, cy: 10 },
      { label: 'D', cx: 112, cy: 40 },
      { label: 'E', cx: 112, cy: 72 },
    ],
  },
];

function ShapeCard({ variant }: { variant: ShapeVariant }) {
  const cornerA = variant.corners[0];
  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white flex flex-col gap-2">
      <div className="text-xs font-mono font-semibold text-gray-600 truncate">{variant.title}</div>

      <svg
        viewBox={variant.viewBox}
        className="w-full border border-gray-100 rounded-lg bg-gray-50"
        style={{ height: '110px' }}
        fill="none"
      >
        {/* Shape fill */}
        <polygon
          points={variant.polygon}
          fill="#dbeafe"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Corner labels */}
        {variant.corners.map((c) => {
          const isA = c.label === 'A';
          const lp = getLabelPosition(c.cx, c.cy, variant.viewBox);
          return (
            <g key={c.label}>
              <circle
                cx={c.cx}
                cy={c.cy}
                r={DOT_R}
                fill={isA ? '#ef4444' : '#3b82f6'}
                stroke="white"
                strokeWidth="1.5"
              />
              <rect
                x={lp.x - 5}
                y={lp.y - 5}
                width="10"
                height="10"
                rx="2"
                fill="white"
                fillOpacity="0.92"
              />
              <text
                x={lp.x}
                y={lp.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7"
                fontWeight="700"
                fill={isA ? '#ef4444' : '#1d4ed8'}
              >
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Corner A position info */}
      <div className="text-xs text-gray-500">
        A = ({cornerA?.cx}, {cornerA?.cy})
      </div>
    </div>
  );
}

export function CornerLabelsDebug() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Debug: Corner Labels</h1>
        <p className="text-sm text-gray-500 mb-6">
          Угол <span className="text-red-500 font-bold">A</span> (красный) должен быть в нижнем
          левом углу каждой фигуры. Остальные — по часовой стрелке.
        </p>

        {/* Group by shape type */}
        {['RECTANGLE', 'L_SHAPE', 'U_SHAPE', 'T_SHAPE', 'CUSTOM'].map((type) => {
          const variants = ALL_VARIANTS.filter((v) => v.key.startsWith(type));
          return (
            <div key={type} className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
                {type}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {variants.map((v) => (
                  <ShapeCard key={v.key} variant={v} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
