import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { wallsApi } from '../../../api/walls';
import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import type { RoomShape, WallMaterial, WallType } from '../../../types/api';

const WALL_MATERIAL_LABELS: Record<WallMaterial, string> = {
  CONCRETE: 'Бетон',
  DRYWALL: 'Гипсокартон',
  BRICK: 'Кирпич',
  OTHER: 'Другое',
};

const WALL_TYPE_LABELS: Record<WallType, string> = {
  EXTERNAL: 'Наружная',
  INTERNAL: 'Внутренняя',
  ADJACENT: 'Смежная (соседи)',
};

const CORNER_LETTERS = 'ABCDEFGH';

function getCornersForShape(shape: RoomShape): Array<{ from: string; to: string }> {
  const counts: Record<RoomShape, number> = {
    RECTANGLE: 4,
    L_SHAPE: 6,
    U_SHAPE: 8,
    CUSTOM: 4,
  };
  const n = counts[shape];
  const letters = CORNER_LETTERS.slice(0, n).split('');
  return letters.map((from, i) => ({
    from,
    to: letters[(i + 1) % n]!,
  }));
}

const wallEntrySchema = z.object({
  cornerFrom: z.string(),
  cornerTo: z.string(),
  length: z.coerce.number().positive('Длина должна быть > 0'),
  material: z.enum(['CONCRETE', 'DRYWALL', 'BRICK', 'OTHER'] as const),
  wallType: z.enum(['EXTERNAL', 'INTERNAL', 'ADJACENT'] as const),
});

const schema = z.object({
  walls: z.array(wallEntrySchema),
});

type WallDimensionsForm = z.infer<typeof schema>;

export function WallDimensionsStep() {
  const { currentRoom, walls, setWalls, upsertWall, setSubstep } = useRoomMeasureStore();

  const corners = currentRoom ? getCornersForShape(currentRoom.shape) : [];

  // Build default values from existing walls or from corner structure
  const defaultWalls = corners.map(({ from, to }, idx) => {
    const existing = walls.find(
      (w) => w.cornerFrom === from && w.cornerTo === to,
    );
    // For rectangles: C-D = A-B length, D-A = B-C length
    let autoLength: number | undefined;
    if (currentRoom?.shape === 'RECTANGLE' && walls.length >= 2) {
      if (idx === 2) autoLength = walls[0]?.length;
      if (idx === 3) autoLength = walls[1]?.length;
    }
    return {
      cornerFrom: from,
      cornerTo: to,
      length: existing?.length ?? autoLength ?? ('' as unknown as number),
      material: (existing?.material ?? 'CONCRETE') as WallMaterial,
      wallType: (existing?.wallType ?? 'INTERNAL') as WallType,
    };
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WallDimensionsForm>({
    resolver: zodResolver(schema),
    defaultValues: { walls: defaultWalls },
  });

  const { fields } = useFieldArray({ control, name: 'walls' });

  // Auto-fill for rectangles: when AB or BC changes, fill CD and DA
  const watchedWalls = watch('walls');
  useEffect(() => {
    if (currentRoom?.shape !== 'RECTANGLE') return;
    const ab = watchedWalls[0]?.length;
    const bc = watchedWalls[1]?.length;
    if (ab && Number(ab) > 0) setValue('walls.2.length', ab);
    if (bc && Number(bc) > 0) setValue('walls.3.length', bc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedWalls[0]?.length, watchedWalls[1]?.length]);

  const onSubmit = async (data: WallDimensionsForm) => {
    if (!currentRoom) return;
    try {
      const saved: typeof walls = [];
      for (let i = 0; i < data.walls.length; i++) {
        const entry = data.walls[i];
        if (!entry) continue;
        const existing = walls.find(
          (w) => w.cornerFrom === entry.cornerFrom && w.cornerTo === entry.cornerTo,
        );
        if (existing) {
          const updated = await wallsApi.update(existing.id, {
            length: entry.length,
            material: entry.material,
            wallType: entry.wallType,
          });
          saved.push(updated);
          upsertWall(updated);
        } else {
          const created = await wallsApi.create(currentRoom.id, {
            cornerFrom: entry.cornerFrom,
            cornerTo: entry.cornerTo,
            length: entry.length,
            material: entry.material,
            wallType: entry.wallType,
            sortOrder: i,
          });
          saved.push(created);
          upsertWall(created);
        }
      }
      setWalls([...walls.filter((w) => !saved.find((s) => s.id === w.id)), ...saved].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ));
      setSubstep(4);
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Ошибка сохранения',
      });
    }
  };

  const isRectangle = currentRoom?.shape === 'RECTANGLE';

  return (
    <div className="p-6 max-w-xl">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">3.3 Габариты стен</h3>
      <p className="text-sm text-gray-500 mb-2">
        Введите длину каждой стены в метрах. Укажите материал и тип стены.
      </p>
      {isRectangle && (
        <p className="text-xs text-primary-700 bg-primary-50 rounded px-3 py-2 mb-4">
          Для прямоугольной комнаты: длины стен C-D и D-A заполняются автоматически
          (равны A-B и B-C соответственно).
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {fields.map((field, idx) => {
          const isAutoFilled = isRectangle && idx >= 2;
          const wallErrors = errors.walls?.[idx];
          return (
            <div key={field.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center">
                  {idx + 1}
                </div>
                <span className="font-medium text-gray-800">
                  Стена {field.cornerFrom}–{field.cornerTo}
                </span>
                {isAutoFilled && (
                  <span className="text-xs text-gray-400">(авто)</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Длина, м"
                  type="number"
                  step="0.001"
                  min="0.001"
                  readOnly={isAutoFilled}
                  error={wallErrors?.length?.message}
                  {...register(`walls.${idx}.length`)}
                />

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Материал</label>
                  <select
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 h-[38px]"
                    {...register(`walls.${idx}.material`)}
                  >
                    {(Object.entries(WALL_MATERIAL_LABELS) as [WallMaterial, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Тип стены</label>
                  <select
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 h-[38px]"
                    {...register(`walls.${idx}.wallType`)}
                  >
                    {(Object.entries(WALL_TYPE_LABELS) as [WallType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}

        {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="secondary" onClick={() => setSubstep(2)}>
            ← Назад
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение…' : 'Далее → Периметр'}
          </Button>
        </div>
      </form>
    </div>
  );
}
