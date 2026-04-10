import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { roomsApi } from '../../api/rooms';
import { useProjectsStore } from '../../stores/projectsStore';
import { useRoomMeasureStore } from '../../stores/roomMeasureStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ShapePicker } from '../../components/ui/ShapePicker';
import { RoomTypeIcon } from '../../components/RoomTypeIcon';
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

const SHAPE_CORNER_COUNT: Record<RoomShape, number> = {
  RECTANGLE: 4,
  L_SHAPE: 6,
  U_SHAPE: 8,
  T_SHAPE: 8,
  CUSTOM: 0,
};

const createRoomSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  type: z.enum(['KITCHEN', 'BEDROOM', 'BATHROOM', 'CORRIDOR', 'BALCONY', 'STORAGE', 'LIVING', 'OTHER'] as const),
  shape: z.enum(['RECTANGLE', 'L_SHAPE', 'U_SHAPE', 'T_SHAPE', 'CUSTOM'] as const),
});

type CreateRoomForm = z.infer<typeof createRoomSchema>;

function getRoomStatus(room: Room): { label: string; bgColor: string; textColor: string } {
  if (!room.isMeasured) {
    return { label: 'Не замерена', bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
  }
  return { label: 'Замерена', bgColor: 'bg-green-100', textColor: 'text-green-700' };
}

function RoomCard({
  room,
  onMeasure,
  onDelete,
  isDragging,
}: {
  room: Room;
  onMeasure: (id: string) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
}) {
  const status = getRoomStatus(room);

  return (
    <div
      className={`flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm transition-opacity ${
        isDragging ? 'opacity-50' : ''
      }`}
      draggable
      data-room-id={room.id}
    >
      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-primary-500" aria-label={`icon-${room.type}`}>
        <RoomTypeIcon type={room.type} size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{room.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-xs text-gray-500 truncate">{ROOM_TYPE_LABELS[room.type]}</p>
          <span className={`text-xs px-1.5 py-0 rounded-full whitespace-nowrap flex-shrink-0 ${status.bgColor} ${status.textColor}`}>
            {status.label}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button size="sm" onClick={() => onMeasure(room.id)}>
          Замерить
        </Button>
        <button
          type="button"
          onClick={() => onDelete(room.id)}
          className="w-6 h-6 rounded text-red-600 hover:bg-red-50 flex items-center justify-center text-sm font-semibold transition-colors"
          aria-label="Удалить"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function RoomsStep() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectsStore();
  const { setShapeOrientation } = useRoomMeasureStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [draggedRoom, setDraggedRoom] = useState<string | null>(null);
  const [pickerOrientation, setPickerOrientation] = useState<0 | 1 | 2 | 3>(0);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateRoomForm>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: { type: 'LIVING', shape: 'RECTANGLE' },
  });

  const selectedShape = watch('shape');

  useEffect(() => {
    if (!projectId) return;
    roomsApi
      .list(projectId)
      .then(setRooms)
      .catch((err) => {
        console.error('Failed to load rooms:', err);
      })
      .finally(() => setIsLoading(false));
  }, [projectId]);

  const handleShapeChange = (shape: RoomShape, orientation: 0 | 1 | 2 | 3) => {
    setValue('shape', shape, { shouldValidate: true });
    setPickerOrientation(orientation);
  };

  const onSubmit = async (data: CreateRoomForm) => {
    if (!projectId) return;
    try {
      const room = await roomsApi.create(projectId, {
        ...data,
        sortOrder: rooms.length,
      });
      setShapeOrientation(pickerOrientation);
      try { localStorage.setItem(`room_orientation_${room.id}`, String(pickerOrientation)); } catch { /* ignore */ }
      setRooms((prev) => [...prev, room]);
      setShowModal(false);
      reset();
      setPickerOrientation(0);
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Ошибка создания',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!projectId || !deleteRoomId) return;
    await roomsApi.remove(projectId, deleteRoomId).catch(() => {});
    setRooms((prev) => prev.filter((r) => r.id !== deleteRoomId));
    setDeleteRoomId(null);
  };

  const handleMeasure = (roomId: string) => {
    navigate(`/wizard/${projectId}/rooms/${roomId}/measure`);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const roomCard = (e.target as HTMLElement).closest('[data-room-id]') as HTMLDivElement | null;
    const roomId = roomCard?.getAttribute('data-room-id');
    if (roomId) {
      setDraggedRoom(roomId);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetRoom: Room): void => {
    e.preventDefault();
    if (!draggedRoom || draggedRoom === targetRoom.id) {
      setDraggedRoom(null);
      return;
    }

    const draggedIdx = rooms.findIndex((r) => r.id === draggedRoom);
    const targetIdx = rooms.findIndex((r) => r.id === targetRoom.id);

    if (draggedIdx >= 0 && targetIdx >= 0) {
      const newRooms = [...rooms];
      const dragged = newRooms[draggedIdx]!;
      const target = newRooms[targetIdx]!;
      newRooms[draggedIdx] = target;
      newRooms[targetIdx] = dragged;
      setRooms(newRooms);
    }

    setDraggedRoom(null);
  };

  const hasMissingRoomTypes = () => {
    const types = new Set(rooms.map((r) => r.type));
    return !types.has('CORRIDOR') || !types.has('BALCONY') || !types.has('STORAGE');
  };

  return (
    <div className="p-4 sm:p-6 pb-24 sm:pb-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-gray-900">Комнаты</h2>
          {currentProject && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{currentProject.name}</p>
          )}
        </div>
        <Button size="sm" onClick={() => setShowModal(true)} className="shrink-0">
          + Добавить
        </Button>
      </div>

      {hasMissingRoomTypes() && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          💡 Не забудьте про коридор, балкон и кладовую!
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Загрузка…</p>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500 mb-3">Нет комнат</p>
          <Button onClick={() => setShowModal(true)}>Добавить первую комнату</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, room)}
              onDragLeave={() => {}}
            >
              <RoomCard
                room={room}
                onMeasure={handleMeasure}
                onDelete={(id) => setDeleteRoomId(id)}
                isDragging={draggedRoom === room.id}
              />
            </div>
          ))}
        </div>
      )}

      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 flex gap-3 mt-6">
        <Button
          variant="secondary"
          className="flex-1 sm:flex-none"
          onClick={() => navigate(`/wizard/${projectId}/info`)}
        >
          ← Назад
        </Button>
        <Button
          className="flex-1 sm:flex-none"
          onClick={() => navigate(`/wizard/${projectId}/plan`)}
          disabled={rooms.length === 0}
        >
          Далее →
        </Button>
      </div>

      <ConfirmDialog
        isOpen={deleteRoomId !== null}
        title="Удалить комнату?"
        message="Все данные комнаты будут удалены без возможности восстановления."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteRoomId(null)}
      />

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset(); setPickerOrientation(0); }} title="Новая комната">
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
            <input type="hidden" {...register('shape')} />
            <ShapePicker
              value={selectedShape}
              orientation={pickerOrientation}
              onChange={handleShapeChange}
            />
          </div>

          {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); reset(); setPickerOrientation(0); }}>
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
