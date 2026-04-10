import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { projectsApi } from '../../api/projects';
import { useProjectsStore } from '../../stores/projectsStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { ObjectType } from '../../types/api';

const infoSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  objectType: z.enum(['APARTMENT', 'STUDIO', 'APARTMENTS', 'HOUSE'] as const),
  address: z.string().optional(),
  defaultCeilingHeight: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return '';
      return typeof val === 'string' ? val.replace(',', '.') : val;
    },
    z.union([
      z.literal(''),
      z.coerce.number().min(1.5, 'Минимум 1.5 м').max(10, 'Максимум 10 м'),
    ]),
  ),
});

type InfoForm = z.infer<typeof infoSchema>;

const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  APARTMENT: 'Квартира',
  STUDIO: 'Студия',
  APARTMENTS: 'Апартаменты',
  HOUSE: 'Дом',
};

export function ProjectInfoStep() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject, upsertProject } = useProjectsStore();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<InfoForm>({ resolver: zodResolver(infoSchema) });

  // Load project
  useEffect(() => {
    if (!projectId) return;
    if (currentProject?.id === projectId) {
      reset({
        name: currentProject.name,
        objectType: currentProject.objectType,
        address: currentProject.address ?? '',
        defaultCeilingHeight: currentProject.defaultCeilingHeight ?? '',
      });
      return;
    }
    projectsApi
      .get(projectId)
      .then((project) => {
        setCurrentProject(project);
        reset({
          name: project.name,
          objectType: project.objectType,
          address: project.address ?? '',
          defaultCeilingHeight: project.defaultCeilingHeight ?? '',
        });
      })
      .catch(() => navigate('/projects', { replace: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const onSubmit = async (data: InfoForm) => {
    if (!projectId) return;
    if (!isDirty) {
      navigate(`/wizard/${projectId}/rooms`);
      return;
    }
    try {
      const updated = await projectsApi.update(projectId, {
        name: data.name,
        objectType: data.objectType,
        address: data.address || undefined,
        defaultCeilingHeight:
          data.defaultCeilingHeight === '' || data.defaultCeilingHeight === undefined
            ? undefined
            : Number(data.defaultCeilingHeight),
      });
      upsertProject(updated);
      setCurrentProject(updated);
      navigate(`/wizard/${projectId}/rooms`);
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Ошибка сохранения',
      });
    }
  };

  return (
    <div className="p-6 pb-24 sm:pb-6 max-w-lg">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Общая информация</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Название объекта"
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
            {(Object.entries(OBJECT_TYPE_LABELS) as [ObjectType, string][]).map(([value, label]) => (
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
          type="text"
          inputMode="decimal"
          placeholder="2.7"
          error={errors.defaultCeilingHeight?.message}
          {...register('defaultCeilingHeight')}
        />

        {errors.root && (
          <p className="text-sm text-red-500">{errors.root.message}</p>
        )}

        <div className="sticky bottom-0 sm:static bg-white sm:bg-transparent border-t sm:border-0 border-gray-100 -mx-6 sm:mx-0 px-6 sm:px-0 py-3 sm:py-0 sm:pt-2 flex gap-3 mt-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 sm:flex-none"
            onClick={() => navigate('/projects')}
          >
            ← Назад
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
            {isSubmitting ? 'Сохранение…' : 'Далее →'}
          </Button>
        </div>
      </form>
    </div>
  );
}
