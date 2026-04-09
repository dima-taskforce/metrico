import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { openingsApi } from '../../../api/openings';
import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { MeasurementHint } from '../../../components/MeasurementHint';
import type { Wall, WindowOpening, DoorOpening } from '../../../types/api';

// --- Window form ---
const windowSchema = z.object({
  height: z.coerce.number().positive('Высота > 0'),
  sillHeightFromScreed: z.coerce.number().min(0, '≥ 0'),
  revealWidthLeft: z.coerce.number().min(0, '≥ 0').optional(),
  revealWidthRight: z.coerce.number().min(0, '≥ 0').optional(),
  isFrenchDoor: z.boolean().optional(),
});
type WindowForm = z.infer<typeof windowSchema>;

// --- Door form ---
const doorSchema = z.object({
  heightFromScreed: z.coerce.number().positive('Высота > 0'),
  revealLeft: z.coerce.number().min(0, '≥ 0').optional(),
  revealRight: z.coerce.number().min(0, '≥ 0').optional(),
  isFrenchDoor: z.boolean().optional(),
});
type DoorForm = z.infer<typeof doorSchema>;

function WindowCard({ wall, win }: { wall: Wall; win: WindowOpening }) {
  const { upsertWindow } = useRoomMeasureStore();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<WindowForm>({
    resolver: zodResolver(windowSchema),
    defaultValues: {
      ...(win.height > 0 && { height: win.height }),
      ...(win.sillHeightFromScreed > 0 && { sillHeightFromScreed: win.sillHeightFromScreed }),
      revealWidthLeft: win.revealWidthLeft ?? undefined,
      revealWidthRight: win.revealWidthRight ?? undefined,
      isFrenchDoor: win.isFrenchDoor,
    },
  });

  const onSubmit = async (data: WindowForm) => {
    const updated = await openingsApi.windows.update(wall.id, win.id, {
      height: data.height,
      sillHeightFromScreed: data.sillHeightFromScreed,
      revealWidthLeft: data.revealWidthLeft,
      revealWidthRight: data.revealWidthRight,
      isFrenchDoor: data.isFrenchDoor,
    });
    upsertWindow(wall.id, updated);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-600">🪟</span>
        <span className="font-medium text-gray-800">
          Окно — ширина: {(win.width / 1000).toFixed(3)} м
          {win.isFrenchDoor && ' (французская дверь)'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Высота, мм"
          type="number"
          step="0.1"
          min="1"
          error={errors.height?.message}
          {...register('height')}
        />
        <Input
          label="Высота подоконника от стяжки, мм"
          type="number"
          step="0.1"
          min="0"
          error={errors.sillHeightFromScreed?.message}
          {...register('sillHeightFromScreed')}
        />
        <Input
          label="Откос слева, мм"
          type="number"
          step="0.1"
          min="0"
          error={errors.revealWidthLeft?.message}
          {...register('revealWidthLeft')}
        />
        <Input
          label="Откос справа, мм"
          type="number"
          step="0.1"
          min="0"
          error={errors.revealWidthRight?.message}
          {...register('revealWidthRight')}
        />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <input type="checkbox" id={`french-${win.id}`} {...register('isFrenchDoor')} />
        <label htmlFor={`french-${win.id}`} className="text-sm text-gray-700">
          Французская / балконная дверь
        </label>
      </div>

      <div className="flex justify-end mt-3">
        <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </form>
  );
}

function DoorCard({ wall, door }: { wall: Wall; door: DoorOpening }) {
  const { upsertDoor } = useRoomMeasureStore();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<DoorForm>({
    resolver: zodResolver(doorSchema),
    defaultValues: {
      ...(door.heightFromScreed > 0 && { heightFromScreed: door.heightFromScreed }),
      revealLeft: door.revealLeft ?? undefined,
      revealRight: door.revealRight ?? undefined,
      isFrenchDoor: door.isFrenchDoor,
    },
  });

  const onSubmit = async (data: DoorForm) => {
    const updated = await openingsApi.doors.update(wall.id, door.id, {
      heightFromScreed: data.heightFromScreed,
      revealLeft: data.revealLeft,
      revealRight: data.revealRight,
      isFrenchDoor: data.isFrenchDoor,
    });
    upsertDoor(wall.id, updated);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-600">🚪</span>
        <span className="font-medium text-gray-800">
          Дверь — ширина: {(door.width / 1000).toFixed(3)} м
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Высота от стяжки, мм"
          type="number"
          step="0.1"
          min="1"
          error={errors.heightFromScreed?.message}
          {...register('heightFromScreed')}
        />
        <div />
        <Input
          label="Откос слева, мм"
          type="number"
          step="0.1"
          min="0"
          error={errors.revealLeft?.message}
          {...register('revealLeft')}
        />
        <Input
          label="Откос справа, мм"
          type="number"
          step="0.1"
          min="0"
          error={errors.revealRight?.message}
          {...register('revealRight')}
        />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <input type="checkbox" id={`french-door-${door.id}`} {...register('isFrenchDoor')} />
        <label htmlFor={`french-door-${door.id}`} className="text-sm text-gray-700">
          Французская / балконная дверь
        </label>
      </div>

      <div className="flex justify-end mt-3">
        <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </form>
  );
}

export function OpeningsStep() {
  const { walls, windows, doors, segments, setWindows, setDoors, setSubstep } = useRoomMeasureStore();
  const [loading, setLoading] = useState(false);

  // Load windows and doors for all walls that have WINDOW/DOOR segments
  useEffect(() => {
    const wallsWithOpenings = walls.filter((w) => {
      const segs = segments[w.id] ?? [];
      return segs.some((s) => s.segmentType === 'WINDOW' || s.segmentType === 'DOOR');
    });

    if (wallsWithOpenings.length === 0) return;
    setLoading(true);

    Promise.all(
      wallsWithOpenings.flatMap((wall) => [
        openingsApi.windows.list(wall.id).then((list) => setWindows(wall.id, list)),
        openingsApi.doors.list(wall.id).then((list) => setDoors(wall.id, list)),
      ]),
    )
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Collect all walls with openings
  const wallsWithOpenings = walls.filter((w) => {
    const wins = windows[w.id] ?? [];
    const drs = doors[w.id] ?? [];
    return wins.length > 0 || drs.length > 0;
  });

  const totalOpenings = wallsWithOpenings.reduce(
    (acc, w) => acc + (windows[w.id]?.length ?? 0) + (doors[w.id]?.length ?? 0),
    0,
  );

  return (
    <div className="p-6 max-w-xl pb-20 sm:pb-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-lg font-semibold text-gray-900">3.5 Проёмы и откосы</h3>
        <MeasurementHint stepKey="window" />
        <MeasurementHint stepKey="door" position="bottom" />
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Для каждого окна и двери введите высоту, высоту подоконника и глубину откосов.
        Ширина проёма уже взята из длины сегмента.
      </p>

      {loading && <p className="text-sm text-gray-400 mb-4">Загрузка…</p>}

      {!loading && totalOpenings === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-800">
            Нет проёмов. Если есть окна или двери — вернитесь на шаг 3.4 и добавьте
            сегменты типа «Окно» или «Дверь».
          </p>
        </div>
      )}

      {wallsWithOpenings.map((wall) => (
        <div key={wall.id} className="mb-5">
          <p className="text-sm font-semibold text-gray-600 mb-2">Стена {wall.label}</p>
          {(windows[wall.id] ?? []).map((win) => (
            <WindowCard key={win.id} wall={wall} win={win} />
          ))}
          {(doors[wall.id] ?? []).map((door) => (
            <DoorCard key={door.id} wall={wall} door={door} />
          ))}
        </div>
      ))}

      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-3 flex justify-between mt-4">
        <Button variant="secondary" onClick={() => setSubstep(4)}>← Назад</Button>
        <Button onClick={() => setSubstep(6)}>Далее → Развёртка</Button>
      </div>
    </div>
  );
}
