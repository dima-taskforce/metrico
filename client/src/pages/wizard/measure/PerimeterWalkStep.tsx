import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { segmentsApi } from '../../../api/segments';
import { openingsApi } from '../../../api/openings';
import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { SegmentType, WallSegment } from '../../../types/api';

const SEGMENT_TYPE_LABELS: Record<SegmentType, string> = {
  PLAIN: 'Стена',
  WINDOW: 'Окно',
  DOOR: 'Дверь',
  PROTRUSION: 'Выступ',
  NICHE: 'Ниша',
  PARTITION: 'Перегородка',
};

const segmentSchema = z.discriminatedUnion('segmentType', [
  z.object({
    segmentType: z.literal('PLAIN'),
    length: z.coerce.number().positive('Длина > 0'),
    description: z.string().optional(),
  }),
  z.object({
    segmentType: z.literal('WINDOW'),
    length: z.coerce.number().positive('Длина > 0'),
    description: z.string().optional(),
  }),
  z.object({
    segmentType: z.literal('DOOR'),
    length: z.coerce.number().positive('Длина > 0'),
    description: z.string().optional(),
  }),
  z.object({
    segmentType: z.literal('PROTRUSION'),
    length: z.coerce.number().positive('Длина > 0'),
    depth: z.coerce.number().positive('Глубина > 0'),
    description: z.string().optional(),
  }),
  z.object({
    segmentType: z.literal('NICHE'),
    length: z.coerce.number().positive('Длина > 0'),
    depth: z.coerce.number().positive('Глубина > 0'),
    description: z.string().optional(),
  }),
  z.object({
    segmentType: z.literal('PARTITION'),
    length: z.coerce.number().positive('Длина > 0'),
    depth: z.coerce.number().positive('Толщина > 0'),
    description: z.string().optional(),
  }),
]);

type SegmentForm = z.infer<typeof segmentSchema>;

export function PerimeterWalkStep() {
  const { walls, segments, setSegments, upsertSegment, removeSegment, upsertWindow, upsertDoor, setSubstep, setActiveWallId } =
    useRoomMeasureStore();

  const [wallIdx, setWallIdx] = useState(0);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    difference: number;
    wallLength: number;
    segmentsSum: number;
  } | null>(null);

  const currentWall = walls[wallIdx];
  const currentSegments: WallSegment[] = currentWall ? (segments[currentWall.id] ?? []) : [];

  useEffect(() => {
    if (currentWall) setActiveWallId(currentWall.id);
    return () => setActiveWallId(null);
  }, [currentWall, setActiveWallId]);

  // Load segments for current wall if not yet loaded
  useEffect(() => {
    if (!currentWall) return;
    if (segments[currentWall.id]) return; // already loaded
    segmentsApi
      .list(currentWall.id)
      .then((list) => setSegments(currentWall.id, list))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWall?.id]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SegmentForm>({
    resolver: zodResolver(segmentSchema),
    defaultValues: { segmentType: 'PLAIN' },
  });

  const segmentType = watch('segmentType');
  const needsDepth = segmentType === 'PROTRUSION' || segmentType === 'NICHE' || segmentType === 'PARTITION';

  const onAddSegment = async (data: SegmentForm) => {
    if (!currentWall) return;
    try {
      const created = await segmentsApi.create(currentWall.id, {
        segmentType: data.segmentType,
        length: data.length,
        sortOrder: currentSegments.length,
        ...(needsDepth && 'depth' in data ? { depth: data.depth } : {}),
        ...('description' in data && data.description ? { description: data.description } : {}),
      });
      upsertSegment(currentWall.id, created);

      // Auto-create window/door opening placeholders
      if (data.segmentType === 'WINDOW') {
        const win = await openingsApi.windows.create(currentWall.id, {
          width: Math.round(data.length * 1000),
          height: 0,
          sillHeightFromScreed: 0,
        });
        upsertWindow(currentWall.id, win);
      }
      if (data.segmentType === 'DOOR') {
        const door = await openingsApi.doors.create(currentWall.id, {
          width: Math.round(data.length * 1000),
          heightFromScreed: 0,
        });
        upsertDoor(currentWall.id, door);
      }

      reset({ segmentType: 'PLAIN' });
      setValidationResult(null);
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : 'Ошибка' });
    }
  };

  const handleRemoveSegment = async (seg: WallSegment) => {
    if (!currentWall) return;
    await segmentsApi.remove(seg.id).catch(() => {});
    removeSegment(currentWall.id, seg.id);
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (!currentWall) return;
    const result = await segmentsApi.validate(currentWall.id).catch(() => null);
    if (result) setValidationResult(result);
  };

  const segmentsSum = currentSegments.reduce((acc, s) => acc + s.length, 0);
  const wallLength = currentWall ? currentWall.length : 0;
  const progress = wallLength > 0 ? Math.min((segmentsSum / wallLength) * 100, 100) : 0;
  const diffMm = Math.abs(wallLength - segmentsSum) * 1000;

  if (!currentWall) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Нет стен. Сначала добавьте стены на шаге 3.3.</p>
        <Button onClick={() => setSubstep(3)} className="mt-4">← Назад</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">3.4 Обход периметра</h3>

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
            onClick={() => {
              setWallIdx(idx);
              setValidationResult(null);
            }}
          >
            {wall.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>
            Сумма сегментов: <strong>{segmentsSum.toFixed(3)}</strong> м
          </span>
          <span>
            Длина стены: <strong>{wallLength.toFixed(3)}</strong> м
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              Math.abs(progress - 100) < 2 ? 'bg-green-500' : 'bg-primary-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        {diffMm > 20 && (
          <p className="text-xs text-amber-700 mt-1">
            Расхождение {diffMm.toFixed(0)}&nbsp;мм — рекомендуется перемерить.
          </p>
        )}
      </div>

      {/* Existing segments */}
      {currentSegments.length > 0 && (
        <div className="mb-4 flex flex-col gap-1">
          {currentSegments.map((seg, idx) => (
            <div key={seg.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
              <span className="text-gray-500 w-5">{idx + 1}</span>
              <span className="flex-1 font-medium text-gray-800">
                {SEGMENT_TYPE_LABELS[seg.segmentType]}
                {seg.description && ` — ${seg.description}`}
              </span>
              <span className="text-gray-600 mr-3">{seg.length.toFixed(3)} м</span>
              <button
                className="text-red-400 hover:text-red-600 text-xs"
                onClick={() => handleRemoveSegment(seg)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add segment form */}
      <form onSubmit={handleSubmit(onAddSegment)} className="bg-gray-50 rounded-xl p-4 mb-4" noValidate>
        <p className="text-sm font-medium text-gray-700 mb-3">Добавить сегмент</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Тип</label>
            <select
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              {...register('segmentType')}
            >
              {(Object.entries(SEGMENT_TYPE_LABELS) as [SegmentType, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <Input
            label="Длина, м"
            type="number"
            step="0.001"
            min="0.001"
            error={errors.length?.message}
            {...register('length')}
          />
        </div>

        {needsDepth && (
          <div className="mb-3">
            <Input
              label={segmentType === 'PARTITION' ? 'Толщина, м' : 'Глубина, м'}
              type="number"
              step="0.001"
              min="0.001"
              error={'depth' in errors ? errors.depth?.message : undefined}
              {...register('depth' as 'length')}
            />
          </div>
        )}

        <div className="mb-3">
          <Input
            label="Описание (необязательно)"
            {...register('description')}
          />
        </div>

        {errors.root && <p className="text-xs text-red-500 mb-2">{errors.root.message}</p>}

        <Button type="submit" size="sm" disabled={isSubmitting}>
          + Добавить
        </Button>
      </form>

      {/* Validate */}
      {currentSegments.length > 0 && (
        <div className="mb-4">
          <Button variant="secondary" size="sm" onClick={handleValidate}>
            Проверить сумму сегментов
          </Button>
          {validationResult && (
            <div
              className={`mt-2 rounded-lg px-3 py-2 text-sm ${
                validationResult.isValid
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {validationResult.isValid
                ? `Стена обмерена корректно. Расхождение: ${(validationResult.difference * 1000).toFixed(1)} мм.`
                : `Расхождение ${(Math.abs(validationResult.difference) * 1000).toFixed(1)} мм — перемерьте стену.`}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setSubstep(3)}>← Назад</Button>
        <div className="flex gap-2">
          {wallIdx < walls.length - 1 ? (
            <Button onClick={() => setWallIdx((i) => i + 1)}>
              Следующая стена →
            </Button>
          ) : (
            <Button onClick={() => setSubstep(5)}>Далее → Проёмы</Button>
          )}
        </div>
      </div>
    </div>
  );
}
