import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { ObjectType } from '../../types/api';

const createSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  objectType: z.enum(['APARTMENT', 'STUDIO', 'APARTMENTS', 'HOUSE'] as const),
  address: z.string().optional(),
  defaultCeilingHeight: z.coerce.number().min(1.5).max(10).optional().or(z.literal('')),
});

type CreateForm = z.infer<typeof createSchema>;

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; objectType: ObjectType; address?: string | undefined; defaultCeilingHeight?: number | undefined }) => Promise<void>;
}

const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  APARTMENT: 'Квартира',
  STUDIO: 'Студия',
  APARTMENTS: 'Апартаменты',
  HOUSE: 'Дом',
};

export function CreateProjectModal({ isOpen, onClose, onSubmit }: CreateProjectModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { objectType: 'APARTMENT' },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: CreateForm) => {
    await onSubmit({
      name: data.name,
      objectType: data.objectType,
      address: data.address || undefined,
      defaultCeilingHeight: data.defaultCeilingHeight === '' || data.defaultCeilingHeight === undefined
        ? undefined
        : Number(data.defaultCeilingHeight),
    });
    handleClose();
  };

  return (
    <Modal title="Новый проект" isOpen={isOpen} onClose={handleClose}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Название"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Тип объекта</label>
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            {...register('objectType')}
          >
            {Object.entries(OBJECT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <Input
          label="Адрес (необязательно)"
          error={errors.address?.message}
          {...register('address')}
        />

        <Input
          label="Высота потолков, м (необязательно)"
          type="number"
          step="0.001"
          min="1.5"
          max="10"
          error={errors.defaultCeilingHeight?.message}
          {...register('defaultCeilingHeight')}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Создание…' : 'Создать'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
