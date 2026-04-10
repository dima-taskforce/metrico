import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlanStore } from '../../stores/planStore';
import { planApi } from '../../api/plan';
import { Button } from '../../components/ui/Button';
import { PlanCanvas } from '../../components/plan/PlanCanvas';

export function PlanStep() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    rooms,
    adjacencies,
    selectedRoomId,
    roomPositions,
    roomPolygons,
    assemblyErrors,
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
    navigate(`/wizard/${projectId}/summary`);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Загрузка плана…</p>
      </div>
    );
  }

  if (!rooms.length) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-yellow-700">
          <p className="font-medium">Комнаты не найдены</p>
          <p className="text-sm mt-1">Вернитесь на шаг выбора комнат и добавьте хотя бы одну</p>
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

      {assemblyErrors.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <p className="font-medium mb-1">Ошибки геометрической сборки:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {assemblyErrors.map((e) => {
              const room = rooms.find((r) => r.id === e.roomId);
              return (
                <li key={e.roomId}>
                  <span className="font-medium">{room?.label ?? e.roomId}:</span> {e.message}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-hidden">
        <div className="text-sm font-medium text-gray-700">План комнат</div>
        <div className="relative flex-1 min-h-[280px] rounded-lg border border-gray-200 overflow-hidden">
          <PlanCanvas
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            roomPositions={roomPositions}
            roomPolygons={roomPolygons}
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

      {/* Footer buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button
          variant="secondary"
          className="flex-1 sm:flex-none"
          onClick={() => navigate(`/wizard/${projectId}/rooms`)}
        >
          ← Назад
        </Button>
        <Button
          className="flex-1 sm:flex-none"
          onClick={handleNext}
          disabled={status === 'assembling'}
        >
          {status === 'assembling' ? 'Сохранение…' : 'Далее →'}
        </Button>
      </div>
    </div>
  );
}
