import { useNavigate } from 'react-router-dom';
import type { Project } from '../../types/api';

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const OBJECT_TYPE_LABELS: Record<Project['objectType'], string> = {
  APARTMENT: 'Квартира',
  STUDIO: 'Студия',
  APARTMENTS: 'Апартаменты',
  HOUSE: 'Дом',
};

const STATUS_LABELS: Record<Project['status'], string> = {
  DRAFT: 'Черновик',
  COMPLETED: 'Завершён',
};

export function ProjectCard({ project, onDelete, onDuplicate }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
          {project.address && (
            <p className="text-sm text-gray-500 truncate mt-0.5">{project.address}</p>
          )}
        </div>
        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {STATUS_LABELS[project.status]}
        </span>
      </div>

      <div className="text-sm text-gray-500 flex gap-3">
        <span>{OBJECT_TYPE_LABELS[project.objectType]}</span>
        {project.defaultCeilingHeight != null && (
          <span>Потолок {project.defaultCeilingHeight} м</span>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => navigate(`/wizard/${project.id}/info`)}
          className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white
            hover:bg-primary-700 transition-colors text-center"
        >
          Открыть
        </button>
        <button
          onClick={() => onDuplicate(project.id)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600
            hover:bg-gray-50 transition-colors"
          title="Дублировать"
        >
          Копия
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600
            hover:bg-red-50 transition-colors"
          title="Удалить"
        >
          Удалить
        </button>
      </div>
    </div>
  );
}
