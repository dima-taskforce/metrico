import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { sketchApi } from '../../../api/sketch';
import { Button } from '../../../components/ui/Button';
import { MeasurementHint } from '../../../components/MeasurementHint';
import type { RoomShape } from '../../../types/api';
import type { SketchData, SketchNode } from '../../../types/sketch';

// ─── Fallback hardcoded shapes ───────────────────────────────────────────────

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

const SHAPE_VARIANTS: Record<string, ShapeVariant> = {
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
};

function getFallbackVariant(shape: RoomShape): ShapeVariant {
  return (
    SHAPE_VARIANTS[`${shape}_0`] ??
    SHAPE_VARIANTS['RECTANGLE_0']!
  );
}

// ─── Sketch polygon helpers ───────────────────────────────────────────────────

const VIEW_W = 200;
const VIEW_H = 160;
const PADDING = 20;
const CORNER_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DOT_R = 6;
const LABEL_OFFSET = 14;
const LABEL_MARGIN = 7;

interface NormalizedCorner {
  label: string;
  description: string;
  cx: number;
  cy: number;
}

function normalizeNodes(
  orderedNodes: SketchNode[],
): NormalizedCorner[] {
  if (orderedNodes.length === 0) return [];

  const xs = orderedNodes.map((n) => n.x);
  const ys = orderedNodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const scaleX = (VIEW_W - PADDING * 2) / rangeX;
  const scaleY = (VIEW_H - PADDING * 2) / rangeY;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = PADDING + ((VIEW_W - PADDING * 2) - rangeX * scale) / 2;
  const offsetY = PADDING + ((VIEW_H - PADDING * 2) - rangeY * scale) / 2;

  const normalized = orderedNodes.map((n) => ({
    cx: offsetX + (n.x - minX) * scale,
    cy: offsetY + (n.y - minY) * scale,
  }));

  // Centroid for descriptions
  const cx = normalized.reduce((s, p) => s + p.cx, 0) / normalized.length;
  const cy = normalized.reduce((s, p) => s + p.cy, 0) / normalized.length;

  return normalized.map((p, idx) => {
    const vert = p.cy < cy ? 'верхний' : 'нижний';
    const horiz = p.cx < cx ? 'левый' : 'правый';
    return {
      label: CORNER_LABELS[idx] ?? String(idx + 1),
      description: `${vert} ${horiz}`,
      cx: p.cx,
      cy: p.cy,
    };
  });
}

function getLabelPosition(
  cx: number,
  cy: number,
): { x: number; y: number } {
  const midX = VIEW_W / 2;
  const midY = VIEW_H / 2;
  const rawX = cx + (cx < midX ? -LABEL_OFFSET : LABEL_OFFSET);
  const rawY = cy + (cy < midY ? -LABEL_OFFSET : LABEL_OFFSET);
  return {
    x: Math.max(LABEL_MARGIN, Math.min(VIEW_W - LABEL_MARGIN, rawX)),
    y: Math.max(LABEL_MARGIN, Math.min(VIEW_H - LABEL_MARGIN, rawY)),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CornerLabelStep() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentRoom, setSubstep } = useRoomMeasureStore();

  const [sketchCorners, setSketchCorners] = useState<NormalizedCorner[] | null>(null);
  const [loadingSketch, setLoadingSketch] = useState(true);

  useEffect(() => {
    if (!projectId || !currentRoom) {
      setLoadingSketch(false);
      return;
    }
    sketchApi.get(projectId).then((json) => {
      if (!json) { setLoadingSketch(false); return; }
      const data: SketchData = JSON.parse(json);
      const sketchRoom =
        data.rooms.find((r) => r.roomId === currentRoom.id) ??
        data.rooms.find((r) => r.label === currentRoom.name) ??
        (data.rooms.length === 1 ? data.rooms[0] : undefined);
      if (!sketchRoom || sketchRoom.nodeIds.length < 3) {
        setLoadingSketch(false);
        return;
      }
      const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
      const orderedNodes = sketchRoom.nodeIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is SketchNode => n !== undefined);
      setSketchCorners(normalizeNodes(orderedNodes));
      setLoadingSketch(false);
    }).catch(() => setLoadingSketch(false));
  }, [projectId, currentRoom]);

  const [activeCorner, setActiveCorner] = useState<number | null>(null);

  const handleContinue = () => {
    setSubstep(2);
  };

  // While loading, show placeholder
  if (loadingSketch) {
    return (
      <div className="p-6 flex items-center justify-center h-40">
        <p className="text-sm text-gray-400">Загрузка эскиза…</p>
      </div>
    );
  }

  // ── Render sketch polygon if available ──────────────────────────────────────
  if (sketchCorners && sketchCorners.length >= 3) {
    const polygonPoints = sketchCorners.map((c) => `${c.cx},${c.cy}`).join(' ');
    const viewBox = `0 0 ${VIEW_W} ${VIEW_H}`;

    return (
      <div className="p-6 max-w-lg pb-20 sm:pb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          3.1 Определение углов
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Эскиз вашей комнаты с обозначенными углами.{' '}
          <span className="font-medium text-gray-700">
            Встаньте у угла A и обходите комнату по часовой стрелке.
          </span>
        </p>

        {/* SVG floor plan from sketch */}
        <div className="mb-6 flex justify-center">
          <svg
            viewBox={viewBox}
            className="w-full max-w-xs border border-gray-200 rounded-xl bg-gray-50"
            style={{ height: '150px' }}
            aria-label="Схема комнаты с обозначенными углами"
          >
            <polygon
              points={polygonPoints}
              fill="#e0f2fe"
              stroke="#0ea5e9"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {sketchCorners.map((corner, idx) => {
              const isActive = activeCorner === idx;
              const labelPos = getLabelPosition(corner.cx, corner.cy);
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

        <div className="flex flex-col gap-2 mb-6">
          {sketchCorners.map((corner, idx) => (
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

        <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-3 flex justify-between">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            ← Назад
          </Button>
          <Button onClick={handleContinue}>Далее →</Button>
        </div>
      </div>
    );
  }

  // ── Fallback: hardcoded shape ─────────────────────────────────────────────
  const shape: RoomShape = currentRoom?.shape ?? 'RECTANGLE';
  const variant = getFallbackVariant(shape);

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

      <div className="mb-6 flex justify-center">
        <svg
          viewBox={variant.viewBox}
          className="w-full max-w-xs border border-gray-200 rounded-xl bg-gray-50"
          style={{ height: '150px' }}
          aria-label="Схема комнаты с обозначенными углами"
        >
          <polygon
            points={variant.polygon}
            fill="#e0f2fe"
            stroke="#0ea5e9"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {variant.corners.map((corner, idx) => {
            const isActive = activeCorner === idx;
            const parts = variant.viewBox.split(' ').map(Number);
            const vw = parts[2] ?? 126;
            const vh = parts[3] ?? 92;
            const midX = vw / 2;
            const midY = vh / 2;
            const rawX = corner.cx + (corner.cx < midX ? -LABEL_OFFSET : LABEL_OFFSET);
            const rawY = corner.cy + (corner.cy < midY ? -LABEL_OFFSET : LABEL_OFFSET);
            const lx = Math.max(LABEL_MARGIN, Math.min(vw - LABEL_MARGIN, rawX));
            const ly = Math.max(LABEL_MARGIN, Math.min(vh - LABEL_MARGIN, rawY));
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
                <rect x={lx - 5} y={ly - 5} width="10" height="10" rx="2" fill="white" fillOpacity="0.9" />
                <text
                  x={lx}
                  y={ly}
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

      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-3 flex justify-between">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← Назад
        </Button>
        <Button onClick={handleContinue}>Далее →</Button>
      </div>
    </div>
  );
}
