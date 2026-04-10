import { useState } from 'react';
import type { RoomType } from '../../types/api';
import { Button } from '../ui/Button';

const ROOM_TYPE_LABELS: { value: RoomType; label: string }[] = [
  { value: 'KITCHEN', label: 'Кухня' },
  { value: 'LIVING', label: 'Гостиная' },
  { value: 'KITCHEN_LIVING', label: 'Кухня-гостиная' },
  { value: 'BEDROOM', label: 'Спальня' },
  { value: 'BATHROOM', label: 'Санузел' },
  { value: 'CORRIDOR', label: 'Коридор/прихожая' },
  { value: 'BALCONY', label: 'Балкон/лоджия' },
  { value: 'STORAGE', label: 'Кладовая' },
  { value: 'LAUNDRY', label: 'Прачечная' },
  { value: 'OFFICE', label: 'Кабинет' },
  { value: 'LIBRARY', label: 'Библиотека' },
  { value: 'OTHER', label: 'Другое' },
];

interface Props {
  roomNumber: number;
  onConfirm: (label: string, type: RoomType) => void;
  onCancel: () => void;
}

export function RoomLabelForm({ roomNumber, onConfirm, onCancel }: Props) {
  const [label, setLabel] = useState(`Комната ${roomNumber}`);
  const [type, setType] = useState<RoomType>('OTHER');

  return (
    <div className="absolute inset-0 flex items-end justify-center bg-black/30 z-20">
      <div className="w-full bg-white rounded-t-2xl p-5 pb-8 flex flex-col gap-4 shadow-xl max-w-md">
        <h3 className="text-base font-semibold text-gray-900">Новая комната</h3>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Название</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Тип помещения</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RoomType)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {ROOM_TYPE_LABELS.map(({ value, label: lbl }) => (
              <option key={value} value={value}>{lbl}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 mt-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Отмена
          </Button>
          <Button onClick={() => onConfirm(label.trim() || `Комната ${roomNumber}`, type)} className="flex-1">
            Создать
          </Button>
        </div>
      </div>
    </div>
  );
}
