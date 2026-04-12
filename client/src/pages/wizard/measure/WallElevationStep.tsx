import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { wallsApi } from '../../../api/walls';
import { elementsApi } from '../../../api/elements';
import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { MeasurementHint } from '../../../components/MeasurementHint';
import type { Wall, WallSegment, ElementType, SegmentType } from '../../../types/api';

const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  COLUMN: 'Колонна',
  VENT_SHAFT: 'Вент-шахта',
  RADIATOR: 'Радиатор',
  ELECTRICAL_PANEL: 'Эл. щиток',
  LOW_VOLTAGE_PANEL: 'Слаботочный щиток',
  PIPE: 'Стояк',
};

const SEGMENT_FILL: Record<SegmentType, string> = {
  PLAIN: '#f3f4f6',
  WINDOW: '#dbeafe',
  DOOR: '#fef3c7',
  PASSAGE: '#d1fae5',
  PROTRUSION: '#ede9fe',
  NICHE: '#dcfce7',
  PARTITION: '#fee2e2',
  STEP: '#fce7f3',
};

const SEGMENT_STROKE: Record<SegmentType, string> = {
  PLAIN: '#d1d5db',
  WINDOW: '#93c5fd',
  DOOR: '#fcd34d',
  PASSAGE: '#6ee7b7',
  PROTRUSION: '#c4b5fd',
  NICHE: '#86efac',
  PARTITION: '#fca5a5',
  STEP: '#f9a8d4',
};

const SEGMENT_LABELS: Partial<Record<SegmentType, string>> = {
  WINDOW: 'О',
  DOOR: 'Д',
  PROTRUSION: 'В',
  NICHE: 'Н',
  PARTITION: 'П',
};

const LEGEND_ITEMS: Array<{ type: SegmentType; label: string }> = [
  { type: 'WINDOW', label: 'Окно' },
  { type: 'DOOR', label: 'Дверь' },
  { type: 'PROTRUSION', label: 'Выступ' },
  { type: 'NICHE', label: 'Ниша' },
  { type: 'PARTITION', label: 'Перегородка' },
];

function ElevationSvg({
  wall,
  segments,
  ceilingHeight,
}: {
  wall: Wall;
  segments: WallSegment[];
  ceilingHeight: number;
}) {
  const SVG_W = 380;
  const SVG_H = 130;
  const PAD_X = 8;
  const PAD_TOP = 16;
  const PAD_BOT = 16;
  const drawW = SVG_W - PAD_X * 2;
  const drawH = SVG_H - PAD_TOP - PAD_BOT;

  // Accumulate segment x positions
  let xAcc = 0;
  const segRects = segments.map((seg) => {
    const xFrac = xAcc / wall.length;
    const wFrac = seg.length / wall.length;
    xAcc += seg.length;
    return {
      seg,
      x: PAD_X + xFrac * drawW,
      w: wFrac * drawW,
    };
  });

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full border border-gray-200 rounded-lg bg-gray-50"
      style={{ height: '150px' }}
      aria-label={`Развёртка стены ${wall.label}`}
    >
      {/* Ceiling line label */}
      <text x={PAD_X + 2} y={PAD_TOP - 2} fontSize="7" fill="#9ca3af">
        потолок {ceilingHeight.toFixed(2)} м
      </text>

      {/* Wall background */}
      <rect
        x={PAD_X}
        y={PAD_TOP}
        width={drawW}
        height={drawH}
        fill="#f9fafb"
        stroke="#9ca3af"
        strokeWidth="1.5"
      />

      {/* Segments */}
      {segRects.map(({ seg, x, w }) => (
        <g key={seg.id}>
          <rect
            x={x}
            y={PAD_TOP}
            width={w}
            height={drawH}
            fill={SEGMENT_FILL[seg.segmentType]}
            stroke={SEGMENT_STROKE[seg.segmentType]}
            strokeWidth="0.5"
          />
          {w > 14 && SEGMENT_LABELS[seg.segmentType] && (
            <text
              x={x + w / 2}
              y={PAD_TOP + drawH / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fill="#374151"
              fontWeight="bold"
            >
              {SEGMENT_LABELS[seg.segmentType]}
            </text>
          )}
        </g>
      ))}

      {/* Floor line label */}
      <text x={PAD_X + 2} y={SVG_H - 1} fontSize="7" fill="#9ca3af">
        пол
      </text>
      {/* Width label */}
      <text
        x={PAD_X + drawW / 2}
        y={SVG_H - 1}
        textAnchor="middle"
        fontSize="7"
        fill="#6b7280"
      >
        {wall.length.toFixed(3)} м
      </text>
    </svg>
  );
}

// --- Curvature form ---
const curvatureSchema = z.object({
  curvatureBottom: z.coerce.number().optional(),
  curvatureMiddle: z.coerce.number().optional(),
  curvatureTop: z.coerce.number().optional(),
});
type CurvatureForm = z.infer<typeof curvatureSchema>;

function CurvatureCard({ wall }: { wall: Wall }) {
  const { upsertWall } = useRoomMeasureStore();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<CurvatureForm>({
    resolver: zodResolver(curvatureSchema),
    defaultValues: {
      curvatureBottom: wall.curvatureBottom ?? undefined,
      curvatureMiddle: wall.curvatureMiddle ?? undefined,
      curvatureTop: wall.curvatureTop ?? undefined,
    },
  });

  const onSubmit = async (data: CurvatureForm) => {
    const updated = await wallsApi.update(wall.roomId, wall.id, {
      curvatureBottom: data.curvatureBottom,
      curvatureMiddle: data.curvatureMiddle,
      curvatureTop: data.curvatureTop,
    });
    upsertWall(updated);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white border border-gray-200 rounded-lg p-4 mb-4"
    >
      <p className="text-sm font-medium text-gray-700 mb-1">Кривизна стены, мм</p>
      <p className="text-xs text-gray-400 mb-3">
        Отклонение поверхности от плоскости. + выпуклость, − вогнутость. Измеряется 2-метровой рейкой.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Низ"
          type="number"
          step="0.1"
          {...register('curvatureBottom')}
        />
        <Input
          label="Середина"
          type="number"
          step="0.1"
          {...register('curvatureMiddle')}
        />
        <Input
          label="Верх"
          type="number"
          step="0.1"
          {...register('curvatureTop')}
        />
      </div>
      <div className="flex justify-end mt-3">
        <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </form>
  );
}

// --- Add element form ---
const elementSchema = z.object({
  elementType: z.enum([
    'COLUMN',
    'VENT_SHAFT',
    'RADIATOR',
    'ELECTRICAL_PANEL',
    'LOW_VOLTAGE_PANEL',
    'PIPE',
  ] as const),
  positionX: z.preprocess((v) => v === '' ? undefined : v, z.coerce.number().min(0, '≥ 0').optional()),
  offsetFromFloor: z.preprocess((v) => v === '' ? undefined : v, z.coerce.number().min(0, '≥ 0').optional()),
  width: z.preprocess((v) => v === '' ? undefined : v, z.coerce.number().positive().optional()),
  description: z.string().optional(),
});
type ElementForm = z.infer<typeof elementSchema>;

export function WallElevationStep() {
  const {
    walls,
    segments,
    elements,
    currentRoom,
    upsertElement,
    removeElement,
    setSubstep,
  } = useRoomMeasureStore();

  const [wallIdx, setWallIdx] = useState(0);
  const currentWall = walls[wallIdx];
  const currentSegments: WallSegment[] = currentWall ? (segments[currentWall.id] ?? []) : [];
  const currentElements = elements.filter((e) => e.wallId === currentWall?.id);
  const ceilingHeight = currentRoom?.ceilingHeight1 ?? 2.5;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ElementForm>({
    resolver: zodResolver(elementSchema),
    defaultValues: { elementType: 'RADIATOR' },
  });

  const onAddElement = async (data: ElementForm) => {
    if (!currentWall || !currentRoom) return;
    try {
      const created = await elementsApi.create(currentRoom.id, {
        elementType: data.elementType,
        wallId: currentWall.id,
        positionX: data.positionX !== undefined ? Math.round(data.positionX * 1000) : undefined,
        offsetFromFloor: data.offsetFromFloor !== undefined ? Math.round(data.offsetFromFloor * 1000) : undefined,
        width: data.width !== undefined ? Math.round(data.width * 1000) : undefined,
        description: data.description,
      });
      upsertElement(created);
      reset({ elementType: 'RADIATOR' });
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : 'Ошибка' });
    }
  };

  const handleRemoveElement = async (elementId: string) => {
    await elementsApi.remove(elementId).catch(() => {});
    removeElement(elementId);
  };

  if (!currentWall) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Нет стен. Сначала добавьте стены на шаге 3.3.</p>
        <Button onClick={() => setSubstep(3)} className="mt-4">
          ← Назад
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl pb-20 sm:pb-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-lg font-semibold text-gray-900">3.6 Развёртка стен</h3>
        <MeasurementHint stepKey="wall-elevation" />
        <MeasurementHint stepKey="curvature" position="bottom" />
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Проверьте развёртку каждой стены, укажите кривизну и разместите элементы.
      </p>

      {/* Wall tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {walls.map((wall, idx) => (
          <button
            key={wall.id}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              idx === wallIdx
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setWallIdx(idx)}
          >
            {wall.label}
          </button>
        ))}
      </div>

      {/* SVG elevation */}
      <div className="mb-3">
        <ElevationSvg
          wall={currentWall}
          segments={currentSegments}
          ceilingHeight={ceilingHeight}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {LEGEND_ITEMS.map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1 text-xs text-gray-600">
            <span
              className="w-3 h-3 rounded-sm inline-block border"
              style={{
                backgroundColor: SEGMENT_FILL[type],
                borderColor: SEGMENT_STROKE[type],
              }}
            />
            {label}
          </div>
        ))}
      </div>

      {/* Curvature — key forces form reset when switching walls */}
      <CurvatureCard key={currentWall.id} wall={currentWall} />

      {/* Elements list */}
      {currentElements.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Элементы на стене</p>
          <div className="flex flex-col gap-1">
            {currentElements.map((el) => (
              <div
                key={el.id}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <span className="flex-1 font-medium text-gray-800">
                  {ELEMENT_TYPE_LABELS[el.elementType]}
                  {el.description && ` — ${el.description}`}
                </span>
                {el.positionX !== null && (
                  <span className="text-gray-500 text-xs">
                    x: {(el.positionX / 1000).toFixed(2)} м
                  </span>
                )}
                {el.offsetFromFloor !== null && (
                  <span className="text-gray-500 text-xs">
                    h: {(el.offsetFromFloor / 1000).toFixed(2)} м
                  </span>
                )}
                <button
                  className="text-red-400 hover:text-red-600 text-xs ml-1"
                  onClick={() => handleRemoveElement(el.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add element form */}
      <form
        onSubmit={handleSubmit(onAddElement)}
        className="bg-gray-50 rounded-xl p-4 mb-4"
        noValidate
      >
        <p className="text-sm font-medium text-gray-700 mb-3">Добавить элемент</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Тип</label>
            <select
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              {...register('elementType')}
            >
              {(Object.entries(ELEMENT_TYPE_LABELS) as [ElementType, string][]).map(
                ([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ),
              )}
            </select>
          </div>
          <Input
            label="Позиция от нач. стены, м"
            type="number"
            step="0.001"
            min="0"
            error={errors.positionX?.message}
            {...register('positionX')}
          />
          <Input
            label="Высота от пола, м"
            type="number"
            step="0.001"
            min="0"
            error={errors.offsetFromFloor?.message}
            {...register('offsetFromFloor')}
          />
          <Input
            label="Ширина, м (необязательно)"
            type="number"
            step="0.001"
            min="0"
            error={errors.width?.message}
            {...register('width')}
          />
        </div>
        <div className="mb-3">
          <Input label="Описание (необязательно)" {...register('description')} />
        </div>
        {errors.root && (
          <p className="text-xs text-red-500 mb-2">{errors.root.message}</p>
        )}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          + Добавить элемент
        </Button>
      </form>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-3 flex justify-between mt-4">
        <Button variant="secondary" onClick={() => setSubstep(5)}>
          ← Назад
        </Button>
        <div className="flex gap-2">
          {wallIdx < walls.length - 1 ? (
            <Button onClick={() => setWallIdx((i) => i + 1)}>Следующая стена →</Button>
          ) : (
            <Button onClick={() => setSubstep(7)}>Далее → Фото</Button>
          )}
        </div>
      </div>
    </div>
  );
}
