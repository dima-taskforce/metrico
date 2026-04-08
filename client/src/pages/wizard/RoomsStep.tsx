import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { roomsApi } from '../../api/rooms';
import { useProjectsStore } from '../../stores/projectsStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { Room, RoomType, RoomShape } from '../../types/api';

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  LIVING: 'Гостиная',
  BEDROOM: 'Спальня',
  KITCHEN: 'Кухня',
  BATHROOM: 'Санузел / Ванная',
  CORRIDOR: 'Коридор / Прихожая',
  BALCONY: 'Балкон / Лоджия',
  STORAGE: 'Кладовая',
  OTHER: 'Другое',
};

const ROOM_SHAPE_LABELS: Record<RoomShape, string> = {
  RECTANGLE: 'Прямоугольник',
  L_SHAPE: 'Г-образная',
  U_SHAPE: 'П-образная',
  CUSTOM: 'Сложная форма',
};

const SHAPE_CORNER_COUNT: Record<RoomShape, number> = {
  RECTANGLE: 4,
  L_SHAPE: 6,
  U_SHAPE: 8,
  CUSTOM: 0,
};

const createRoomSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  type: z.enum(['KITCHEN', 'BEDROOM', 'BATHROOM', 'CORRIDOR', 'BALCONY', 'STORAGE', 'LIVING', 'OTHER'] as const),
  shape: z.enum(['RECTANGLE', 'L_SHAPE', 'U_SHAPE', 'CUSTOM'] as const),
});

type CreateRoomForm = z.infer<typeof createRoomSchema>;

export function RoomsStep() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectsStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateRoomForm>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: { type: 'LIVING', shape: 'RECTANGLE' },
  });

  useEffect(() => {
    if (!projectId) return;
    roomsApi
      .list(projectId)
      .then(setRooms)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [projectId]);

  const onSubmit = async (data: CreateRoomForm) => {
    if (!projectId) return;
    try {
      const room = await roomsApi.create(projectId, {
        ...data,
        sortOrder: rooms.length,
      });
      setRooms((prev) => [...prev, room]);
      setShowModal(false);
      reset();
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Ошибка создания',
      });
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!projectId) return;
    if (!confirm('Удалить комнату? Все данные будут потеряны.')) return;
    await roomsApi.remove(projectId, roomId).catch(() => {});
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  const handleMeasure = (roomId: string) => {
    navigate(`/wizard/${projectId}/rooms/${roomId}/measure`);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Комнаты</h2>
          {currentProject && (
            <p className="text-sm text-gray-500 mt-1">{currentProject.name}</p>
          )}
        </div>
        <Button onClick={() => setShowModal(true)}>+ Добавить комнату</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Загрузка…</p>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500 mb-3">Нет комнат</p>
          <Button onClick={() => setShowModal(true)}>Добавить первую комнату</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">{room.name}</p>
                <p className="text-sm text-gray-500">
                  {ROOM_TYPE_LABELS[room.type]} · {ROOM_SHAPE_LABELS[room.shape]}
                  {SHAPE_CORNER_COUNT[room.shape] > 0 &&
                    ` · ${SHAPE_CORNER_COUNT[room.shape]} угла`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {room.isMeasured ? (
                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                    Обмерен
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded">
                    Не обмерен
                  </span>
                )}
                <Button size="sm" onClick={() => handleMeasure(room.id)}>
                  {room.isMeasured ? 'Редактировать' : 'Обмерить'}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(room.id)}
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
        <Button variant="secondary" onClick={() => navigate(`/wizard/${projectId}/info`)}>
          ← Назад
        </Button>
        <Button
          onClick={() => navigate(`/wizard/${projectId}/walls`)}
          disabled={rooms.length === 0}
        >
          Далее →
        </Button>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset(); }} title="Новая комната">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input label="Название" error={errors.name?.message} {...register('name')} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Тип комнаты</label>
            <select
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              {...register('type')}
            >
              {(Object.entries(ROOM_TYPE_LABELS) as [RoomType, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Форма комнаты</label>
            <select
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              {...register('shape')}
            >
              {(Object.entries(ROOM_SHAPE_LABELS) as [RoomShape, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); reset(); }}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Создание…' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
