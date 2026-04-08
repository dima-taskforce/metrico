import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomsApi } from '../../api/rooms';
import { wallsApi } from '../../api/walls';
import { anglesApi } from '../../api/angles';
import { elementsApi } from '../../api/elements';
import { useRoomMeasureStore, type MeasureSubstep } from '../../stores/roomMeasureStore';
import { CornerLabelStep } from './measure/CornerLabelStep';
import { CeilingHeightStep } from './measure/CeilingHeightStep';
import { WallDimensionsStep } from './measure/WallDimensionsStep';
import { PerimeterWalkStep } from './measure/PerimeterWalkStep';
import { OpeningsStep } from './measure/OpeningsStep';
import { WallElevationStep } from './measure/WallElevationStep';
import { PhotoChecklistStep } from './measure/PhotoChecklistStep';

const SUBSTEP_LABELS: Record<MeasureSubstep, string> = {
  1: 'Углы',
  2: 'Высота потолка',
  3: 'Стены',
  4: 'Периметр',
  5: 'Проёмы',
  6: 'Развёртка',
  7: 'Фото и чеклист',
};

export function MeasureStep() {
  const { projectId, roomId } = useParams<{ projectId: string; roomId: string }>();
  const navigate = useNavigate();
  const {
    currentRoom,
    currentSubstep,
    setCurrentRoom,
    setWalls,
    setAngles,
    setElements,
    reset,
  } = useRoomMeasureStore();

  // Load room data on mount or when roomId changes
  useEffect(() => {
    if (!projectId || !roomId) return;

    reset();

    Promise.all([
      roomsApi.get(projectId, roomId),
      wallsApi.list(roomId),
      anglesApi.list(roomId),
      elementsApi.list(roomId),
    ])
      .then(([room, walls, angles, elements]) => {
        setCurrentRoom(room);
        setWalls(walls);
        setAngles(angles);
        setElements(elements);
      })
      .catch(() => navigate(`/wizard/${projectId}/rooms`, { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, projectId]);

  if (!currentRoom) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Загрузка комнаты…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            className="hover:text-gray-800 transition-colors"
            onClick={() => navigate(`/wizard/${projectId}/rooms`)}
          >
            ← Комнаты
          </button>
          <span>/</span>
          <span className="font-medium text-gray-800">{currentRoom.name}</span>
        </div>
        {/* Substep progress */}
        <div className="flex items-center gap-1 mt-3">
          {([1, 2, 3, 4, 5, 6, 7] as MeasureSubstep[]).map((step) => (
            <div key={step} className="flex items-center gap-1">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                  step === currentSubstep
                    ? 'bg-primary-600 text-white'
                    : step < currentSubstep
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {step}
              </div>
              {step < 7 && (
                <div
                  className={`w-6 h-0.5 ${step < currentSubstep ? 'bg-primary-300' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
          <span className="ml-3 text-sm font-medium text-gray-700">
            {SUBSTEP_LABELS[currentSubstep]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {currentSubstep === 1 && <CornerLabelStep />}
        {currentSubstep === 2 && <CeilingHeightStep />}
        {currentSubstep === 3 && <WallDimensionsStep />}
        {currentSubstep === 4 && <PerimeterWalkStep />}
        {currentSubstep === 5 && <OpeningsStep />}
        {currentSubstep === 6 && <WallElevationStep />}
        {currentSubstep === 7 && <PhotoChecklistStep />}
      </div>
    </div>
  );
}
