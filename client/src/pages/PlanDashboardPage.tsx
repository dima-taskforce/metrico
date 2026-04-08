import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { planApi } from '../api/plan';
import { projectsApi } from '../api/projects';
import { usePlanStore } from '../stores/planStore';
import type { ProjectStatus } from '../types/api';
import { PlanCanvas } from '../components/plan/PlanCanvas';
import { PlanTotals } from '../components/dashboard/PlanTotals';
import { RoomDetailsSidebar } from '../components/dashboard/RoomDetailsSidebar';

export function PlanDashboardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    rooms,
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
    reset,
  } = usePlanStore();

  const [projectLabel, setProjectLabel] = useState('Проект');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [reopenLoading, setReopenLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    reset();
    setStatus('loading');

    Promise.all([
      planApi.getFloorPlan(projectId),
      projectsApi.get(projectId),
    ])
      .then(([planData, project]) => {
        setPlanData(planData);
        setProjectLabel(planData.projectLabel ?? 'Проект');
        setProjectStatus(project.status);
        setStatus('done');
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Ошибка загрузки плана');
        setStatus('error');
      });
  }, [projectId, reset, setStatus, setPlanData, setError]);

  // Reset selected wall when room changes
  useEffect(() => {
    setSelectedWallId(null);
  }, [selectedRoomId]);

  const handleSelectRoom = useCallback(
    (roomId: string) => {
      setSelectedRoomId(selectedRoomId === roomId ? null : roomId);
    },
    [selectedRoomId, setSelectedRoomId],
  );

  const handleCloseSidebar = useCallback(() => {
    setSelectedRoomId(null);
  }, [setSelectedRoomId]);

  const handleReopen = async () => {
    if (!projectId) return;
    setReopenLoading(true);
    try {
      await projectsApi.reopen(projectId);
      navigate(`/wizard/${projectId}/plan`);
    } finally {
      setReopenLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!projectId) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      const blob = await planApi.downloadPdf(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plan-${projectId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError('Не удалось скачать PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <p className="text-gray-500 text-sm">Загрузка плана…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <p className="text-red-500 text-sm">{error ?? 'Ошибка загрузки'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-base font-semibold text-gray-900 truncate">{projectLabel}</h1>
        <div className="flex items-center gap-2">
          {projectStatus === 'COMPLETED' && (
            <button
              onClick={handleReopen}
              disabled={reopenLoading}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-50"
            >
              {reopenLoading ? 'Открытие…' : 'Редактировать'}
            </button>
          )}
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {pdfLoading ? 'Загрузка…' : 'Скачать PDF'}
          </button>
        </div>
      </header>

      {pdfError && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-xs border-b border-red-100">
          {pdfError}
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas + totals */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* 2D Canvas */}
          <div
            className="flex-1 min-h-0 relative bg-gray-50"
            data-testid="plan-canvas-wrapper"
          >
            {rooms.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Нет данных. Создайте план в мастере.
              </div>
            ) : (
              <PlanCanvas
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={handleSelectRoom}
                roomPositions={roomPositions}
                onUpdateRoomPosition={(roomId, pos) =>
                  updateRoomPosition(roomId, pos)
                }
                scale={scale}
                onScaleChange={setScale}
              />
            )}
          </div>

          {/* Totals */}
          <div className="shrink-0 p-4 border-t border-gray-200 overflow-y-auto max-h-72">
            <PlanTotals rooms={rooms} projectLabel={projectLabel} />
          </div>
        </div>

        {/* Room details sidebar (desktop: fixed panel; mobile: overlays) */}
        {selectedRoom && (
          <div
            className={[
              'w-80 shrink-0 border-l border-gray-200 bg-white',
              'hidden sm:block overflow-y-auto',
            ].join(' ')}
          >
            <RoomDetailsSidebar
              room={selectedRoom}
              selectedWallId={selectedWallId}
              onSelectWall={setSelectedWallId}
              onClose={handleCloseSidebar}
            />
          </div>
        )}
      </div>

      {/* Mobile: bottom sheet sidebar */}
      {selectedRoom && (
        <div
          className="sm:hidden fixed inset-x-0 bottom-0 z-30 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto border-t border-gray-200"
          data-testid="room-sidebar-mobile"
        >
          <RoomDetailsSidebar
            room={selectedRoom}
            selectedWallId={selectedWallId}
            onSelectWall={setSelectedWallId}
            onClose={handleCloseSidebar}
          />
        </div>
      )}
    </div>
  );
}
