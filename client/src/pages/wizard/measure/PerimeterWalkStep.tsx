import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { segmentsApi } from '../../../api/segments';
import { openingsApi } from '../../../api/openings';
import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { WallMiniMap } from '../../../components/WallMiniMap';
import type { SegmentType, WallSegment } from '../../../types/api';

const SEGMENT_TYPE_LABELS: Record<SegmentType, string> = {
  PLAIN: 'Стена',
  WINDOW: 'Окно',
  DOOR: 'Дверь',
  PROTRUSION: 'Выступ',
  NICHE: 'Ниша',
  PARTITION: 'Перегородка',
  STEP: 'Ступенька',
};

// Context-aware field labels per type
const LENGTH_LABEL: Record<SegmentType, string> = {
  PLAIN: 'Длина участка, м',
  WINDOW: 'Ширина проёма, м',
  DOOR: 'Ширина проёма, м',
  PROTRUSION: 'Длина выступа, м',
  NICHE: 'Ширина ниши, м',
  PARTITION: 'Длина перегородки, м',
  STEP: 'Ширина ступеньки, м',
};

const DEPTH_LABEL: Record<SegmentType, string> = {
  PLAIN: '',
  WINDOW: '',
  DOOR: '',
  PROTRUSION: 'Глубина выступа, м',
  NICHE: 'Глубина ниши, м',
  PARTITION: 'Толщина перегородки, м',
  STEP: 'Глубина ступеньки, м',
};


const segmentSchema = z.discriminatedUnion('segmentType', [
  z.object({
    segmentType: z.literal('PLAIN'),
    length: z.coerce.number().positive('Длина > 0'),
    description: z.string().optional(),
  }),
  z.object({
    segmentType: z.literal('WINDOW'),
    length: z.coerce.number().positive('Ширина > 0'),
    description: z.string().optional(),
  }),
  z.object({
    segmentType: z.literal('DOOR'),
    length: z.coerce.number().positive('Ширина > 0'),
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
    length: z.coerce.number().positive('Ширина > 0'),
    depth: z.coerce.number().positive('Глубина > 0'),
    description: z.string().optional(),
  }),
  z.object({
    segmentType: z.literal('PARTITION'),
    length: z.coerce.number().positive('Длина > 0'),
    depth: z.coerce.number().positive('Толщина > 0'),
    description: z.string().optional(),
  }),
  z.object({
    segmentType: z.literal('STEP'),
    length: z.coerce.number().positive('Ширина > 0'),
    depth: z.coerce.number().positive('Глубина > 0'),
    isInner: z.boolean().optional(),
    description: z.string().optional(),
  }),
]);

type SegmentForm = z.infer<typeof segmentSchema>;

function calcRemainder(wallLength: number, segs: WallSegment[]): number {
  const sum = segs.reduce((acc, s) => acc + (s.length ?? 0), 0);
  return Math.max(0, +(wallLength - sum).toFixed(3));
}

export function PerimeterWalkStep() {
  const {
    currentRoom,
    shapeOrientation,
    walls,
    segments,
    setSegments,
    upsertSegment,
    removeSegment,
    upsertWindow,
    upsertDoor,
    setSubstep,
    setActiveWallId,
  } = useRoomMeasureStore();

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
    if (segments[currentWall.id]) return;
    segmentsApi
      .list(currentWall.id)
      .then((list) => setSegments(currentWall.id, list))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWall?.id]);

  const wallLength = currentWall ? currentWall.length : 0;
  const remainder = calcRemainder(wallLength, currentSegments);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SegmentForm>({
    resolver: zodResolver(segmentSchema),
    defaultValues: { segmentType: 'PLAIN', length: remainder || ('' as unknown as number) },
  });

  // Re-sync default length when wall changes or segments load
  useEffect(() => {
    const r = calcRemainder(wallLength, currentSegments);
    reset({ segmentType: 'PLAIN', length: r || ('' as unknown as number) });
    setValidationResult(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWall?.id, segments[currentWall?.id ?? '']?.length]);

  const segmentType = watch('segmentType');
  const needsDepth = segmentType === 'PROTRUSION' || segmentType === 'NICHE' || segmentType === 'PARTITION' || segmentType === 'STEP';
  const isStep = segmentType === 'STEP';

  // Reset form fields when type changes
  useEffect(() => {
    const r = calcRemainder(wallLength, currentSegments);
    const lengthVal = r || ('' as unknown as number);
    if (segmentType === 'PLAIN') {
      reset({ segmentType: 'PLAIN', length: lengthVal });
    } else {
      reset({ segmentType, length: '' as unknown as number } as SegmentForm);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentType]);

  const goToWall = (idx: number) => {
    setWallIdx(idx);
    setValidationResult(null);
  };

  const onAddSegment = async (data: SegmentForm) => {
    if (!currentWall) return;
    try {
      const created = await segmentsApi.create(currentWall.id, {
        segmentType: data.segmentType,
        length: data.length,
        sortOrder: currentSegments.length,
        ...(needsDepth && 'depth' in data ? { depth: data.depth } : {}),
        ...('isInner' in data && data.isInner !== undefined ? { isInner: data.isInner } : {}),
        ...('description' in data && data.description ? { description: data.description } : {}),
      });
      upsertSegment(currentWall.id, created);

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

      const newSegs = [...currentSegments, created];
      const newRemainder = calcRemainder(wallLength, newSegs);
      reset({ segmentType: 'PLAIN', length: newRemainder || ('' as unknown as number) });
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

  const segmentsSum = currentSegments.reduce((acc, s) => acc + (s.length ?? 0), 0);
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
    <div className="p-6 max-w-xl pb-20 sm:pb-6">
      {/* Header with mini-map */}
      <div className="flex flex-col gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">3.4 Детализация стен</h3>
          <p className="text-sm text-gray-500">
            Разбейте стену на участки: просто стена, окно, дверь, выступ. Если особых участков нет — нажмите «Далее».
          </p>
        </div>
        {currentRoom && (
          <div className="w-full h-36 text-primary-400">
            <WallMiniMap
              shape={currentRoom.shape}
              orientation={shapeOrientation}
              cornerFrom={currentWall.cornerFrom}
              cornerTo={currentWall.cornerTo}
            />
          </div>
        )}
      </div>

      {/* Wall navigation */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">
          Стена {wallIdx + 1} из {walls.length}
          {' '}
          <span className="text-primary-600 font-semibold">
            {currentWall.cornerFrom}–{currentWall.cornerTo}
          </span>
        </span>
        <span className="text-xs text-gray-400">{currentWall.label}</span>
      </div>
      <div className="flex gap-1.5 mb-4">
        {walls.map((wall, idx) => (
          <button
            key={wall.id}
            aria-label={`Стена ${wall.cornerFrom}–${wall.cornerTo}`}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              idx === wallIdx ? 'bg-primary-600' : 'bg-gray-200'
            }`}
            onClick={() => goToWall(idx)}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>
            Сумма: <strong>{segmentsSum.toFixed(3)}</strong> м
          </span>
          <span>
            Стена: <strong>{wallLength.toFixed(3)}</strong> м
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
        {diffMm > 20 && currentSegments.length > 0 && (
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
                {seg.segmentType === 'STEP' && seg.isInner !== null && seg.isInner !== undefined
                  ? ` (${seg.isInner ? 'внутренняя' : 'внешняя'})`
                  : ''}
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

        {/* Type selector */}
        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700 block mb-1">Тип</label>
          <select
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            {...register('segmentType')}
          >
            {(Object.entries(SEGMENT_TYPE_LABELS) as [SegmentType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Length / width — context-aware label */}
        <div className="mb-3">
          <Input
            label={LENGTH_LABEL[segmentType]}
            type="number"
            step="0.001"
            min="0.001"
            error={errors.length?.message}
            {...register('length')}
          />
        </div>

        {/* Depth — for PROTRUSION, NICHE, PARTITION, STEP */}
        {needsDepth && (
          <div className="mb-3">
            <Input
              label={DEPTH_LABEL[segmentType]}
              type="number"
              step="0.001"
              min="0.001"
              error={'depth' in errors ? errors.depth?.message : undefined}
              {...register('depth' as 'length')}
            />
          </div>
        )}

        {/* isInner toggle — only for STEP */}
        {isStep && (
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Тип ступеньки:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                value="false"
                {...register('isInner' as 'length')}
                onChange={() => setValue('isInner' as 'length', false as unknown as number)}
              />
              <span className="text-sm text-gray-700">Внешняя</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                value="true"
                {...register('isInner' as 'length')}
                onChange={() => setValue('isInner' as 'length', true as unknown as number)}
              />
              <span className="text-sm text-gray-700">Внутренняя</span>
            </label>
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
      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-3 flex justify-between mt-4">
        {wallIdx > 0 ? (
          <Button variant="secondary" onClick={() => goToWall(wallIdx - 1)}>← Назад</Button>
        ) : (
          <Button variant="secondary" onClick={() => setSubstep(3)}>← Назад</Button>
        )}
        <div className="flex gap-2">
          {wallIdx < walls.length - 1 ? (
            <Button onClick={() => goToWall(wallIdx + 1)}>
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
