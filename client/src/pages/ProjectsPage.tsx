import { useEffect, useState } from 'react';
import { projectsApi, type CreateProjectData } from '../api/projects';
import { useProjectsStore } from '../stores/projectsStore';
import { ProjectCard } from '../components/projects/ProjectCard';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function ProjectsPage() {
  const { projects, isLoading, error, setProjects, setLoading, setError, upsertProject, removeProject } =
    useProjectsStore();
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    projectsApi
      .list()
      .then(setProjects)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [setProjects, setLoading, setError]);

  const handleCreate = async (data: CreateProjectData) => {
    const project = await projectsApi.create(data);
    upsertProject(project);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    await projectsApi.delete(deleteId);
    removeProject(deleteId);
    setDeleteId(null);
  };

  const handleDuplicate = async (id: string) => {
    const copy = await projectsApi.duplicate(id);
    upsertProject(copy);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Мои проекты</h1>
        <Button onClick={() => setModalOpen(true)}>+ Новый проект</Button>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-400">Загрузка…</p>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {!isLoading && !error && projects.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">Проектов пока нет</p>
          <Button onClick={() => setModalOpen(true)}>Создать первый проект</Button>
        </div>
      )}

      {projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={(id) => setDeleteId(id)}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Удалить проект?"
        message="Все данные проекта будут удалены без возможности восстановления."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
