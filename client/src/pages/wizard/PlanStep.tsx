import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlanStore } from '../../stores/planStore';
import { planApi } from '../../api/plan';
import { Button } from '../../components/ui/Button';
import { AdjacencyForm } from '../../components/plan/AdjacencyForm';
import { PlanCanvas } from '../../components/plan/PlanCanvas';
import type { AdjacencyFormData } from '../../components/plan/AdjacencyForm';

export function PlanStep() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    rooms,
    adjacencies,
    selectedRoomId,
    roomPositions,
    scale,
    status,
    error,
    setPlanData,
    setSelectedRoomId,
    updateRoomPosition,
    setScale,
    setStatus,
    setError,
    addAdjacency,
    removeAdjacency,
  } = usePlanStore();

  const [isFormLoading, setIsFormLoading] = useState(false);
  const [selectedAdjacencyId, setSelectedAdjacencyId] = useState<string | null>(null);

  // Load floor plan on mount
  useEffect(() => {
    if (!projectId) return;

    setStatus('loading');
    planApi
      .getFloorPlan(projectId)
      .then((data) => {
        setPlanData(data);
        setStatus('done');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки плана');
        setStatus('error');
      });
  }, [projectId, setPlanData, setStatus, setError]);

  const handleCreateAdjacency = async (formData: AdjacencyFormData) => {
    if (!projectId) return;

    setIsFormLoading(true);
    try {
      const adjacency = await planApi.createAdjacency(projectId, {
        wallAId: formData.wallAId,
        wallBId: formData.wallBId,
        hasDoorBetween: formData.hasDoorBetween,
      });
      addAdjacency(adjacency);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания связи');
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDeleteAdjacency = async (adjacencyId: string) => {
    if (!projectId) return;

    try {
      await planApi.deleteAdjacency(projectId, adjacencyId);
      removeAdjacency(adjacencyId);
      setSelectedAdjacencyId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления связи');
    }
  };

  const handleRotateRoom = () => {
    if (!selectedRoomId) return;
    const current = roomPositions[selectedRoomId] ?? { x: 0, y: 0, rotation: 0 };
    updateRoomPosition(selectedRoomId, {
      rotation: (current.rotation + 90) % 360,
    });
  };

  const handleSaveLayout = async () => {
    if (!projectId) return;

    setStatus('assembling');
    try {
      const layoutJson = JSON.stringify(roomPositions);
      await planApi.saveFloorPlanLayout(projectId, layoutJson);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения плана');
      setStatus('error');
    }
  };

  const handleNext = async () => {
    await handleSaveLayout();
    navigate(`/wizard/${projectId}/walls`);
  };

  if (status === 'loading' || !rooms.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Загрузка плана…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          <p className="font-medium">Ошибка при загрузке плана</p>
          <p className="text-sm mt-1">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/wizard/${projectId}/rooms`)}
            className="mt-4"
          >
            Вернуться к комнатам
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Сборка плана</h2>
        <p className="text-sm text-gray-500 mt-1">
          Создайте связи между комнатами и расположите их на плане
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium hover:underline"
          >
            ✕ Закрыть
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden">
        {/* Canvas section */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="text-sm font-medium text-gray-700">План комнат</div>
          <div className="relative flex-1 rounded-lg border border-gray-200 overflow-hidden">
            <PlanCanvas
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              roomPositions={roomPositions}
              onUpdateRoomPosition={updateRoomPosition}
              scale={scale}
              onScaleChange={setScale}
            />
          </div>

          {/* Canvas controls */}
          {selectedRoomId && (
            <div className="flex gap-2 px-4 py-2 bg-gray-50 rounded border border-gray-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRotateRoom}
              >
                ↻ Повернуть на 90°
              </Button>
              <span className="flex items-center text-sm text-gray-600">
                Выбранная комната: {rooms.find((r) => r.id === selectedRoomId)?.label}
              </span>
            </div>
          )}
        </div>

        {/* Sidebar with adjacencies and form */}
        <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto">
          {/* Adjacencies list */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-gray-700">Связи комнат</div>
            {adjacencies.length === 0 ? (
              <p className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                Связи между комнатами не установлены
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {adjacencies.map((adj) => (
                  <div
                    key={adj.id}
                    onClick={() => setSelectedAdjacencyId(adj.id)}
                    className={`p-3 rounded border text-sm cursor-pointer transition ${
                      selectedAdjacencyId === adj.id
                        ? 'bg-primary-50 border-primary-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">
                      {adj.wallALabel} ↔ {adj.wallBLabel}
                    </p>
                    {adj.hasDoor && (
                      <p className="text-xs text-gray-600 mt-1"><span>🚪</span> С дверью</p>
                    )}
                    {selectedAdjacencyId === adj.id && (
                      <button
                        onClick={() => handleDeleteAdjacency(adj.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium mt-2"
                      >
                        ✕ Удалить
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Adjacency form */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-gray-700">Новая связь</div>
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <AdjacencyForm
                rooms={rooms}
                onSubmit={handleCreateAdjacency}
                isLoading={isFormLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex justify-between gap-4 pt-4 border-t border-gray-200">
        <Button
          variant="secondary"
          onClick={() => navigate(`/wizard/${projectId}/rooms`)}
        >
          ← Назад
        </Button>
        <Button
          onClick={handleNext}
          disabled={status === 'assembling'}
        >
          {status === 'assembling' ? 'Сохранение…' : 'Далее →'}
        </Button>
      </div>
    </div>
  );
}
