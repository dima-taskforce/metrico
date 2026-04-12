import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { wallsApi } from '../../../api/walls';
import { sketchApi } from '../../../api/sketch';
import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { MeasurementHint } from '../../../components/MeasurementHint';
import type { RoomShape, WallMaterial, WallType } from '../../../types/api';

const WALL_MATERIAL_OPTIONS: { value: WallMaterial; label: string }[] = [
  { value: 'CONCRETE', label: 'Бетон' },
  { value: 'BRICK', label: 'Кирпич' },
  { value: 'DRYWALL', label: 'ГК' },
  { value: 'OTHER', label: 'Другое' },
];

const WALL_TYPE_OPTIONS: { value: WallType; label: string }[] = [
  { value: 'EXTERNAL', label: 'Наружная' },
  { value: 'INTERNAL', label: 'Внутренняя' },
  { value: 'ADJACENT', label: 'Смежная' },
];

const CORNER_LETTERS = 'ABCDEFGH';

const SHAPE_CORNER_COUNTS: Record<RoomShape, number> = {
  RECTANGLE: 4,
  L_SHAPE: 6,
  U_SHAPE: 8,
  T_SHAPE: 8,
  CUSTOM: 4,
};

function cornersFromCount(n: number): Array<{ from: string; to: string }> {
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
  const { projectId } = useParams<{ projectId: string }>();
  const { currentRoom, walls, setWalls, upsertWall, setSubstep } = useRoomMeasureStore();
  const [cornerCount, setCornerCount] = useState<number | null>(null);

  useEffect(() => {
    if (!currentRoom) {
      setCornerCount(4);
      return;
    }
    if (!projectId) {
      setCornerCount(SHAPE_CORNER_COUNTS[currentRoom.shape]);
      return;
    }
    sketchApi.get(projectId).then((data) => {
      if (data) {
        const sketchRoom =
          data.rooms.find((r) => r.roomId === currentRoom.id) ??
          data.rooms.find((r) => r.label === currentRoom.name) ??
          (data.rooms.length === 1 ? data.rooms[0] : undefined);
        if (sketchRoom && sketchRoom.nodeIds.length >= 3) {
          setCornerCount(sketchRoom.nodeIds.length);
          return;
        }
      }
      setCornerCount(SHAPE_CORNER_COUNTS[currentRoom.shape]);
    }).catch(() => {
      setCornerCount(SHAPE_CORNER_COUNTS[currentRoom.shape]);
    });
  }, [projectId, currentRoom]);

  if (cornerCount === null) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Загрузка…</p>
      </div>
    );
  }

  return <WallDimensionsForm cornerCount={cornerCount} />;
}

function WallDimensionsForm({ cornerCount }: { cornerCount: number }) {
  const { currentRoom, walls, setWalls, upsertWall, setSubstep } = useRoomMeasureStore();

  const corners = cornersFromCount(cornerCount);

  const defaultWalls = corners.map(({ from, to }) => {
    const existing = walls.find(
      (w) => w.cornerFrom === from && w.cornerTo === to,
    );
    return {
      cornerFrom: from,
      cornerTo: to,
      length: existing?.length ?? ('' as unknown as number),
      material: (existing?.material ?? 'CONCRETE') as WallMaterial,
      wallType: (existing?.wallType ?? 'INTERNAL') as WallType,
    };
  });

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WallDimensionsForm>({
    resolver: zodResolver(schema),
    defaultValues: { walls: defaultWalls },
  });

  const { fields } = useFieldArray({ control, name: 'walls' });

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
          const updated = await wallsApi.update(currentRoom.id, existing.id, {
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

  return (
    <div className="p-6 max-w-xl pb-20 sm:pb-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-lg font-semibold text-gray-900">3.3 Габариты стен</h3>
        <MeasurementHint stepKey="wall-length" />
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Введите длину каждой стены в метрах. Укажите материал и тип стены.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {fields.map((field, idx) => {
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
              </div>

              <div className="flex flex-col gap-3">
                <Input
                  label="Длина, м"
                  type="number"
                  step="0.001"
                  min="0.001"
                  error={wallErrors?.length?.message}
                  {...register(`walls.${idx}.length`)}
                />

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Материал</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WALL_MATERIAL_OPTIONS.map(({ value, label }) => (
                      <label key={value} className="cursor-pointer">
                        <input
                          type="radio"
                          value={value}
                          className="sr-only peer"
                          {...register(`walls.${idx}.material`)}
                        />
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-600 bg-white transition-colors peer-checked:bg-primary-500 peer-checked:border-primary-500 peer-checked:text-white">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Тип стены</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WALL_TYPE_OPTIONS.map(({ value, label }) => (
                      <label key={value} className="cursor-pointer">
                        <input
                          type="radio"
                          value={value}
                          className="sr-only peer"
                          {...register(`walls.${idx}.wallType`)}
                        />
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-600 bg-white transition-colors peer-checked:bg-primary-500 peer-checked:border-primary-500 peer-checked:text-white">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

        <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-3 flex justify-between mt-4">
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
