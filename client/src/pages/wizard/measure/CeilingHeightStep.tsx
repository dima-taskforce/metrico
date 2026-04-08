import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams } from 'react-router-dom';
import { roomsApi } from '../../../api/rooms';
import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

const schema = z.object({
  ceilingHeight1: z.coerce.number().min(1.5, 'Минимум 1.5 м').max(10, 'Максимум 10 м'),
  ceilingHeight2: z.preprocess((v) => v === '' ? undefined : v, z.coerce.number().min(1.5, 'Минимум 1.5 м').max(10, 'Максимум 10 м').optional()),
});

type CeilingForm = z.infer<typeof schema>;

export function CeilingHeightStep() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentRoom, setCurrentRoom, setSubstep } = useRoomMeasureStore();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CeilingForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...(currentRoom?.ceilingHeight1 != null && { ceilingHeight1: currentRoom.ceilingHeight1 }),
      ...(currentRoom?.ceilingHeight2 != null && { ceilingHeight2: currentRoom.ceilingHeight2 }),
    },
  });

  const h1 = watch('ceilingHeight1');
  const h2 = watch('ceilingHeight2');
  const diff = h1 && h2 ? Math.abs(h1 - h2) : 0;
  const hasWarning = diff > 0.01; // > 10mm

  const onSubmit = async (data: CeilingForm) => {
    if (!projectId || !currentRoom) return;
    try {
      const updated = await roomsApi.update(projectId, currentRoom.id, {
        ceilingHeight1: data.ceilingHeight1,
        ceilingHeight2: data.ceilingHeight2,
      });
      setCurrentRoom(updated);
      setSubstep(3);
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Ошибка сохранения',
      });
    }
  };

  return (
    <div className="p-6 max-w-md pb-20 sm:pb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">3.2 Высота потолка</h3>
      <p className="text-sm text-gray-500 mb-6">
        Измерьте высоту в двух точках: у наружной стены (под окном) и у противоположной.
      </p>

      {/* Illustration */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <svg viewBox="0 0 200 120" className="w-full h-28" fill="none" stroke="currentColor" strokeWidth="1.5">
          {/* Room outline */}
          <rect x="10" y="10" width="180" height="90" className="text-gray-300" />
          {/* Window */}
          <rect x="20" y="10" width="40" height="20" className="text-blue-300" fill="rgb(219 234 254)" stroke="rgb(147 197 253)" />
          {/* Height line 1 (near window) */}
          <line x1="35" y1="30" x2="35" y2="100" className="text-primary-500" strokeDasharray="4 2" />
          <text x="38" y="70" fontSize="9" className="fill-primary-700">H1</text>
          {/* Height line 2 (opposite wall) */}
          <line x1="165" y1="10" x2="165" y2="100" className="text-orange-400" strokeDasharray="4 2" />
          <text x="168" y="60" fontSize="9" className="fill-orange-700">H2</text>
          {/* Floor label */}
          <text x="80" y="115" fontSize="9" className="fill-gray-500">пол (стяжка)</text>
        </svg>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="H1 — у наружной стены / окна, м"
          type="number"
          step="0.001"
          min="1.5"
          max="10"
          error={errors.ceilingHeight1?.message}
          {...register('ceilingHeight1')}
        />

        <Input
          label="H2 — у противоположной стены, м (необязательно)"
          type="number"
          step="0.001"
          min="1.5"
          max="10"
          error={errors.ceilingHeight2?.message}
          {...register('ceilingHeight2')}
        />

        {hasWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              Разница {(diff * 1000).toFixed(0)}&nbsp;мм — потолок заметно наклонён.
              Убедитесь в правильности замеров.
            </p>
          </div>
        )}

        {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

        <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-3 flex justify-between mt-4">
          <Button type="button" variant="secondary" onClick={() => setSubstep(1)}>
            ← Назад
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение…' : 'Далее → Стены'}
          </Button>
        </div>
      </form>
    </div>
  );
}
