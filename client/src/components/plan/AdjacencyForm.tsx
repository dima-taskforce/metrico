import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import type { FloorPlanRoom } from '../../types/api';

const createAdjacencySchema = z.object({
  roomAId: z.string().min(1, 'Выберите комнату 1'),
  wallAId: z.string().min(1, 'Выберите стену 1'),
  roomBId: z.string().min(1, 'Выберите комнату 2'),
  wallBId: z.string().min(1, 'Выберите стену 2'),
  hasDoorBetween: z.boolean(),
});

export type AdjacencyFormData = {
  wallAId: string;
  wallBId: string;
  hasDoorBetween: boolean;
};

type InternalFormData = z.infer<typeof createAdjacencySchema>;

interface AdjacencyFormProps {
  rooms: FloorPlanRoom[];
  onSubmit: (data: AdjacencyFormData) => Promise<void>;
  isLoading?: boolean;
}

export function AdjacencyForm({ rooms, onSubmit, isLoading = false }: AdjacencyFormProps) {
  const [selectedRoomAId, setSelectedRoomAId] = useState<string>('');
  const [selectedRoomBId, setSelectedRoomBId] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InternalFormData>({
    resolver: zodResolver(createAdjacencySchema),
    defaultValues: {
      hasDoorBetween: false,
    },
  });

  const roomAId = watch('roomAId');
  const roomBId = watch('roomBId');

  const roomA = rooms.find((r) => r.id === roomAId);
  const roomB = rooms.find((r) => r.id === roomBId);

  const handleFormSubmit = async (data: InternalFormData) => {
    try {
      await onSubmit({ wallAId: data.wallAId, wallBId: data.wallBId, hasDoorBetween: data.hasDoorBetween });
      reset();
      setSelectedRoomAId('');
      setSelectedRoomBId('');
    } catch {
      // Error is handled by parent
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Room A */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Комната 1</label>
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            {...register('roomAId', {
              onChange: (e) => setSelectedRoomAId(e.target.value),
            })}
          >
            <option value="">Выберите комнату</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.label}
              </option>
            ))}
          </select>
          {errors.roomAId && (
            <p className="text-xs text-red-500">{errors.roomAId.message}</p>
          )}
        </div>

        {/* Wall A */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Стена комнаты 1</label>
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            disabled={!roomA}
            {...register('wallAId')}
          >
            <option value="">Выберите стену</option>
            {roomA?.walls.map((wall) => (
              <option key={wall.id} value={wall.id}>
                {wall.label}
              </option>
            ))}
          </select>
          {errors.wallAId && (
            <p className="text-xs text-red-500">{errors.wallAId.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Room B */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Комната 2</label>
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            {...register('roomBId', {
              onChange: (e) => setSelectedRoomBId(e.target.value),
            })}
          >
            <option value="">Выберите комнату</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.label}
              </option>
            ))}
          </select>
          {errors.roomBId && (
            <p className="text-xs text-red-500">{errors.roomBId.message}</p>
          )}
        </div>

        {/* Wall B */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Стена комнаты 2</label>
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            disabled={!roomB}
            {...register('wallBId')}
          >
            <option value="">Выберите стену</option>
            {roomB?.walls.map((wall) => (
              <option key={wall.id} value={wall.id}>
                {wall.label}
              </option>
            ))}
          </select>
          {errors.wallBId && (
            <p className="text-xs text-red-500">{errors.wallBId.message}</p>
          )}
        </div>
      </div>

      {/* Door option */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="hasDoorBetween"
          className="w-4 h-4 rounded border-gray-300"
          {...register('hasDoorBetween')}
        />
        <label htmlFor="hasDoorBetween" className="text-sm text-gray-700">
          Между комнатами дверь
        </label>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || isLoading}
        className="w-full"
      >
        {isSubmitting || isLoading ? 'Создание связи…' : 'Создать связь'}
      </Button>
    </form>
  );
}
