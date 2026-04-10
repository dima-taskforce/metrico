import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { Button } from '../../../components/ui/Button';
import { MeasurementHint } from '../../../components/MeasurementHint';
import type { RoomShape } from '../../../types/api';

interface CornerDef {
  label: string;
  description: string;
  cx: number;
  cy: number;
}

interface ShapeVariant {
  viewBox: string;
  polygon: string;
  corners: CornerDef[];
}

type ShapeOrientationKey = `${RoomShape}_${0 | 1 | 2 | 3}`;

const SHAPE_VARIANTS: Record<string, ShapeVariant> = {
  // RECTANGLE — same for all orientations
  RECTANGLE_0: {
    viewBox: '0 0 126 92',
    polygon: '14,72 14,12 110,12 110,72',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 14, cy: 72 },
      { label: 'B', description: 'левый верхний', cx: 14, cy: 12 },
      { label: 'C', description: 'правый верхний', cx: 110, cy: 12 },
      { label: 'D', description: 'правый нижний', cx: 110, cy: 72 },
    ],
  },
  RECTANGLE_1: {
    viewBox: '0 0 126 92',
    polygon: '14,72 14,12 110,12 110,72',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 14, cy: 72 },
      { label: 'B', description: 'левый верхний', cx: 14, cy: 12 },
      { label: 'C', description: 'правый верхний', cx: 110, cy: 12 },
      { label: 'D', description: 'правый нижний', cx: 110, cy: 72 },
    ],
  },
  RECTANGLE_2: {
    viewBox: '0 0 126 92',
    polygon: '14,72 14,12 110,12 110,72',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 14, cy: 72 },
      { label: 'B', description: 'левый верхний', cx: 14, cy: 12 },
      { label: 'C', description: 'правый верхний', cx: 110, cy: 12 },
      { label: 'D', description: 'правый нижний', cx: 110, cy: 72 },
    ],
  },
  RECTANGLE_3: {
    viewBox: '0 0 126 92',
    polygon: '14,72 14,12 110,12 110,72',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 14, cy: 72 },
      { label: 'B', description: 'левый верхний', cx: 14, cy: 12 },
      { label: 'C', description: 'правый верхний', cx: 110, cy: 12 },
      { label: 'D', description: 'правый нижний', cx: 110, cy: 72 },
    ],
  },

  // L_SHAPE — ориентация 0: выемка справа сверху
  L_SHAPE_0: {
    viewBox: '0 0 126 112',
    polygon: '12,100 12,10 72,10 72,50 112,50 112,100',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 12, cy: 100 },
      { label: 'B', description: 'левый верхний', cx: 12, cy: 10 },
      { label: 'C', description: 'верхний (ступень)', cx: 72, cy: 10 },
      { label: 'D', description: 'внутренний угол', cx: 72, cy: 50 },
      { label: 'E', description: 'правый средний', cx: 112, cy: 50 },
      { label: 'F', description: 'правый нижний', cx: 112, cy: 100 },
    ],
  },
  // L_SHAPE — ориентация 1: выемка справа снизу
  L_SHAPE_1: {
    viewBox: '0 0 126 112',
    polygon: '14,100 14,11 115,11 115,64 70,64 70,100',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 14, cy: 100 },
      { label: 'B', description: 'левый верхний', cx: 14, cy: 11 },
      { label: 'C', description: 'правый верхний', cx: 115, cy: 11 },
      { label: 'D', description: 'правый (внутр.)', cx: 115, cy: 64 },
      { label: 'E', description: 'внутренний угол', cx: 70, cy: 64 },
      { label: 'F', description: 'нижний (ступень)', cx: 70, cy: 100 },
    ],
  },
  // L_SHAPE — ориентация 2: выемка слева снизу
  L_SHAPE_2: {
    viewBox: '0 0 126 112',
    polygon: '14,62 14,12 114,12 114,102 54,102 54,62',
    corners: [
      { label: 'A', description: 'нижний левый (ступень)', cx: 54, cy: 102 },
      { label: 'B', description: 'внутренний угол', cx: 54, cy: 62 },
      { label: 'C', description: 'левый нижний (стены)', cx: 14, cy: 62 },
      { label: 'D', description: 'левый верхний', cx: 14, cy: 12 },
      { label: 'E', description: 'правый верхний', cx: 114, cy: 12 },
      { label: 'F', description: 'правый нижний', cx: 114, cy: 102 },
    ],
  },
  // L_SHAPE — ориентация 3: выемка слева сверху
  L_SHAPE_3: {
    viewBox: '0 0 126 112',
    polygon: '11,101 11,48 56,48 56,12 112,12 112,101',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 11, cy: 101 },
      { label: 'B', description: 'левый средний', cx: 11, cy: 48 },
      { label: 'C', description: 'внутренний угол', cx: 56, cy: 48 },
      { label: 'D', description: 'верхний (ступень)', cx: 56, cy: 12 },
      { label: 'E', description: 'правый верхний', cx: 112, cy: 12 },
      { label: 'F', description: 'правый нижний', cx: 112, cy: 101 },
    ],
  },

  // U_SHAPE — ориентация 0: открытие снизу
  U_SHAPE_0: {
    viewBox: '0 0 148 106',
    polygon: '10,90 10,10 130,10 130,90 100,90 100,40 40,40 40,90',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 10, cy: 90 },
      { label: 'B', description: 'левый верхний', cx: 10, cy: 10 },
      { label: 'C', description: 'правый верхний', cx: 130, cy: 10 },
      { label: 'D', description: 'правый нижний', cx: 130, cy: 90 },
      { label: 'E', description: 'нижний правый (внутр.)', cx: 100, cy: 90 },
      { label: 'F', description: 'внутренний правый', cx: 100, cy: 40 },
      { label: 'G', description: 'внутренний левый', cx: 40, cy: 40 },
      { label: 'H', description: 'нижний левый (внутр.)', cx: 40, cy: 90 },
    ],
  },
  // U_SHAPE — ориентация 1: открытие справа
  U_SHAPE_1: {
    viewBox: '0 0 148 106',
    polygon: '22,93 22,72 92,72 92,29 22,29 22,7 134,7 134,93',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 22, cy: 93 },
      { label: 'B', description: 'левый нижний (внутр.)', cx: 22, cy: 72 },
      { label: 'C', description: 'внутренний нижний', cx: 92, cy: 72 },
      { label: 'D', description: 'внутренний верхний', cx: 92, cy: 29 },
      { label: 'E', description: 'левый верхний (внутр.)', cx: 22, cy: 29 },
      { label: 'F', description: 'левый верхний', cx: 22, cy: 7 },
      { label: 'G', description: 'правый верхний', cx: 134, cy: 7 },
      { label: 'H', description: 'правый нижний', cx: 134, cy: 93 },
    ],
  },
  // U_SHAPE — ориентация 2: открытие сверху
  U_SHAPE_2: {
    viewBox: '0 0 148 106',
    polygon: '18,96 18,16 48,16 48,66 108,66 108,16 138,16 138,96',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 18, cy: 96 },
      { label: 'B', description: 'левый верхний', cx: 18, cy: 16 },
      { label: 'C', description: 'верхний левый (внутр.)', cx: 48, cy: 16 },
      { label: 'D', description: 'внутренний левый', cx: 48, cy: 66 },
      { label: 'E', description: 'внутренний правый', cx: 108, cy: 66 },
      { label: 'F', description: 'верхний правый (внутр.)', cx: 108, cy: 16 },
      { label: 'G', description: 'правый верхний', cx: 138, cy: 16 },
      { label: 'H', description: 'правый нижний', cx: 138, cy: 96 },
    ],
  },
  // U_SHAPE — ориентация 3: открытие слева
  U_SHAPE_3: {
    viewBox: '0 0 148 106',
    polygon: '14,99 14,13 126,13 126,34 56,34 56,77 126,77 126,99',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 14, cy: 99 },
      { label: 'B', description: 'левый верхний', cx: 14, cy: 13 },
      { label: 'C', description: 'правый верхний', cx: 126, cy: 13 },
      { label: 'D', description: 'правый верхний (внутр.)', cx: 126, cy: 34 },
      { label: 'E', description: 'внутренний верхний', cx: 56, cy: 34 },
      { label: 'F', description: 'внутренний нижний', cx: 56, cy: 77 },
      { label: 'G', description: 'правый нижний (внутр.)', cx: 126, cy: 77 },
      { label: 'H', description: 'правый нижний', cx: 126, cy: 99 },
    ],
  },

  // T_SHAPE — ориентация 0: стебель вверху
  T_SHAPE_0: {
    viewBox: '0 0 148 106',
    polygon: '10,90 10,50 45,50 45,10 95,10 95,50 130,50 130,90',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 10, cy: 90 },
      { label: 'B', description: 'левый средний', cx: 10, cy: 50 },
      { label: 'C', description: 'внутренний левый', cx: 45, cy: 50 },
      { label: 'D', description: 'верхний левый (стебля)', cx: 45, cy: 10 },
      { label: 'E', description: 'верхний правый (стебля)', cx: 95, cy: 10 },
      { label: 'F', description: 'внутренний правый', cx: 95, cy: 50 },
      { label: 'G', description: 'правый средний', cx: 130, cy: 50 },
      { label: 'H', description: 'правый нижний', cx: 130, cy: 90 },
    ],
  },
  // T_SHAPE — ориентация 1: стебель справа
  T_SHAPE_1: {
    viewBox: '0 0 148 106',
    polygon: '22,93 78,93 78,68 134,68 134,32 78,32 78,7 22,7',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 22, cy: 93 },
      { label: 'B', description: 'левый верхний', cx: 22, cy: 7 },
      { label: 'C', description: 'верхний (у выступа)', cx: 78, cy: 7 },
      { label: 'D', description: 'внутренний верхний', cx: 78, cy: 32 },
      { label: 'E', description: 'правый верхний (стебля)', cx: 134, cy: 32 },
      { label: 'F', description: 'правый нижний (стебля)', cx: 134, cy: 68 },
      { label: 'G', description: 'внутренний нижний', cx: 78, cy: 68 },
      { label: 'H', description: 'нижний (у выступа)', cx: 78, cy: 93 },
    ],
  },
  // T_SHAPE — ориентация 2: стебель снизу
  T_SHAPE_2: {
    viewBox: '0 0 148 106',
    polygon: '18,56 53,56 53,96 103,96 103,56 138,56 138,16 18,16',
    corners: [
      { label: 'A', description: 'нижний левый (стебля)', cx: 53, cy: 96 },
      { label: 'B', description: 'внутренний левый', cx: 53, cy: 56 },
      { label: 'C', description: 'левый нижний (основания)', cx: 18, cy: 56 },
      { label: 'D', description: 'левый верхний', cx: 18, cy: 16 },
      { label: 'E', description: 'правый верхний', cx: 138, cy: 16 },
      { label: 'F', description: 'правый нижний (основания)', cx: 138, cy: 56 },
      { label: 'G', description: 'внутренний правый', cx: 103, cy: 56 },
      { label: 'H', description: 'нижний правый (стебля)', cx: 103, cy: 96 },
    ],
  },
  // T_SHAPE — ориентация 3: стебель слева
  T_SHAPE_3: {
    viewBox: '0 0 148 106',
    polygon: '14,74 14,38 70,38 70,13 126,13 126,99 70,99 70,74',
    corners: [
      { label: 'A', description: 'нижний левый (основания)', cx: 70, cy: 99 },
      { label: 'B', description: 'внутренний нижний', cx: 70, cy: 74 },
      { label: 'C', description: 'левый нижний (стебля)', cx: 14, cy: 74 },
      { label: 'D', description: 'левый верхний (стебля)', cx: 14, cy: 38 },
      { label: 'E', description: 'внутренний верхний', cx: 70, cy: 38 },
      { label: 'F', description: 'верхний (у основания)', cx: 70, cy: 13 },
      { label: 'G', description: 'правый верхний', cx: 126, cy: 13 },
      { label: 'H', description: 'правый нижний', cx: 126, cy: 99 },
    ],
  },

  // CUSTOM — same for all orientations
  CUSTOM_0: {
    viewBox: '0 0 126 92',
    polygon: '12,72 12,10 82,10 112,40 112,72',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 12, cy: 72 },
      { label: 'B', description: 'левый верхний', cx: 12, cy: 10 },
      { label: 'C', description: 'верхний правый', cx: 82, cy: 10 },
      { label: 'D', description: 'правый средний', cx: 112, cy: 40 },
      { label: 'E', description: 'правый нижний', cx: 112, cy: 72 },
    ],
  },
  CUSTOM_1: {
    viewBox: '0 0 126 92',
    polygon: '12,72 12,10 82,10 112,40 112,72',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 12, cy: 72 },
      { label: 'B', description: 'левый верхний', cx: 12, cy: 10 },
      { label: 'C', description: 'верхний правый', cx: 82, cy: 10 },
      { label: 'D', description: 'правый средний', cx: 112, cy: 40 },
      { label: 'E', description: 'правый нижний', cx: 112, cy: 72 },
    ],
  },
  CUSTOM_2: {
    viewBox: '0 0 126 92',
    polygon: '12,72 12,10 82,10 112,40 112,72',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 12, cy: 72 },
      { label: 'B', description: 'левый верхний', cx: 12, cy: 10 },
      { label: 'C', description: 'верхний правый', cx: 82, cy: 10 },
      { label: 'D', description: 'правый средний', cx: 112, cy: 40 },
      { label: 'E', description: 'правый нижний', cx: 112, cy: 72 },
    ],
  },
  CUSTOM_3: {
    viewBox: '0 0 126 92',
    polygon: '12,72 12,10 82,10 112,40 112,72',
    corners: [
      { label: 'A', description: 'левый нижний', cx: 12, cy: 72 },
      { label: 'B', description: 'левый верхний', cx: 12, cy: 10 },
      { label: 'C', description: 'верхний правый', cx: 82, cy: 10 },
      { label: 'D', description: 'правый средний', cx: 112, cy: 40 },
      { label: 'E', description: 'правый нижний', cx: 112, cy: 72 },
    ],
  },
};

const DOT_R = 6;
const LABEL_OFFSET = 14;
const LABEL_MARGIN = 7;

function getVariantKey(shape: RoomShape, orientation: 0 | 1 | 2 | 3): string {
  return `${shape}_${orientation}`;
}

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

export function CornerLabelStep() {
  const navigate = useNavigate();
  const { currentRoom, shapeOrientation, setSubstep } =
    useRoomMeasureStore();

  const shape: RoomShape = currentRoom?.shape ?? 'RECTANGLE';
  const orientation = shapeOrientation ?? 0;

  const variantKey = getVariantKey(shape, orientation as 0 | 1 | 2 | 3);
  const variant = SHAPE_VARIANTS[variantKey] ?? SHAPE_VARIANTS['RECTANGLE_0']!;

  const [activeCorner, setActiveCorner] = useState<number | null>(null);

  const handleContinue = () => {
    setSubstep(2);
  };

  return (
    <div className="p-6 max-w-lg pb-20 sm:pb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        3.1 Определение углов
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        Ниже показана схема вашей комнаты. Углы пронумерованы от A.{' '}
        <span className="font-medium text-gray-700">
          Встаньте у угла A и обходите комнату по часовой стрелке.
        </span>
      </p>

      {/* SVG floor plan */}
      <div className="mb-6 flex justify-center">
        <svg
          viewBox={variant.viewBox}
          className="w-full max-w-xs border border-gray-200 rounded-xl bg-gray-50"
          style={{ height: '150px' }}
          aria-label="Схема комнаты с обозначенными углами"
        >
          {/* Room outline */}
          <polygon
            points={variant.polygon}
            fill="#e0f2fe"
            stroke="#0ea5e9"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Corner dots and labels */}
          {variant.corners.map((corner, idx) => {
            const isActive = activeCorner === idx;
            const labelPos = getLabelPosition(corner.cx, corner.cy, variant.viewBox);
            return (
              <g
                key={corner.label}
                className="cursor-pointer"
                onClick={() => setActiveCorner(idx === activeCorner ? null : idx)}
              >
                <circle
                  cx={corner.cx}
                  cy={corner.cy}
                  r={DOT_R}
                  fill={isActive ? '#0284c7' : '#0ea5e9'}
                  stroke="white"
                  strokeWidth="1.5"
                />
                <rect
                  x={labelPos.x - 5}
                  y={labelPos.y - 5}
                  width="10"
                  height="10"
                  rx="2"
                  fill="white"
                  fillOpacity="0.9"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fontWeight="600"
                  fill={isActive ? '#0284c7' : '#374151'}
                >
                  {corner.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <MeasurementHint stepKey="corner-label" className="mb-6" />

      {/* Corner list */}
      <div className="flex flex-col gap-2 mb-6">
        {variant.corners.map((corner, idx) => (
          <button
            key={corner.label}
            type="button"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left transition-colors ${
              activeCorner === idx
                ? 'border-sky-400 bg-sky-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
            onClick={() => setActiveCorner(idx === activeCorner ? null : idx)}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                activeCorner === idx
                  ? 'bg-sky-500 text-white'
                  : 'bg-sky-100 text-sky-700'
              }`}
            >
              {corner.label}
            </span>
            <span className="text-sm text-gray-700">{corner.description}</span>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-3 flex justify-between">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← Назад
        </Button>
        <Button onClick={handleContinue}>Далее →</Button>
      </div>
    </div>
  );
}
