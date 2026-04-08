import type { FloorPlanRoom, FloorPlanWall } from '../../types/api';

interface RoomDetailsSidebarProps {
  room: FloorPlanRoom;
  selectedWallId: string | null;
  onSelectWall: (wallId: string | null) => void;
  onClose: () => void;
}

const WALL_TYPE_LABELS: Record<string, string> = {
  EXTERNAL: 'Внешняя',
  INTERNAL: 'Внутренняя',
  ADJACENT: 'Смежная',
};

const MATERIAL_LABELS: Record<string, string> = {
  CONCRETE: 'Ж/Б',
  DRYWALL: 'ГКЛ',
  BRICK: 'Кирпич',
  OTHER: 'Другой',
};

const SEGMENT_TYPE_LABELS: Record<string, string> = {
  PLAIN: 'Глухой',
  WINDOW: 'Окно',
  DOOR: 'Дверь',
  PROTRUSION: 'Выступ',
  NICHE: 'Ниша',
  PARTITION: 'Перегородка',
};

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  COLUMN: 'Колонна',
  VENT_SHAFT: 'Вент-шахта',
  RADIATOR: 'Радиатор',
  ELECTRICAL_PANEL: 'Электрощит',
  LOW_VOLTAGE_PANEL: 'Слаботочный щит',
  PIPE: 'Труба',
};

function WallDetailPanel({ wall }: { wall: FloorPlanWall }) {
  const windows = wall.openings.filter((o) => o.type === 'WINDOW');
  const doors = wall.openings.filter((o) => o.type === 'DOOR');

  return (
    <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
      <h4 className="font-medium text-blue-800 mb-2">
        Стена {wall.label} — {(wall.length / 1000).toFixed(3)} м
      </h4>

      <div className="grid grid-cols-2 gap-1 text-xs mb-2">
        <span className="text-gray-500">Материал:</span>
        <span>{MATERIAL_LABELS[wall.material] ?? wall.material}</span>
        <span className="text-gray-500">Тип:</span>
        <span>{WALL_TYPE_LABELS[wall.wallType] ?? wall.wallType}</span>
      </div>

      {wall.segments.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-600 mb-1">Секции:</p>
          <div className="space-y-1">
            {wall.segments.map((seg) => (
              <div key={seg.id} className="flex justify-between text-xs">
                <span>{SEGMENT_TYPE_LABELS[seg.segmentType] ?? seg.segmentType}</span>
                <span className="text-gray-500">{(seg.length / 1000).toFixed(3)} м</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {windows.length > 0 && (
        <div className="mb-1">
          <p className="text-xs font-medium text-gray-600">
            Окна ({windows.length}):
          </p>
          {windows.map((w) => (
            <p key={w.id} className="text-xs text-gray-500">
              {w.label}: {w.width} × {w.height} мм
            </p>
          ))}
        </div>
      )}

      {doors.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600">
            Двери ({doors.length}):
          </p>
          {doors.map((d) => (
            <p key={d.id} className="text-xs text-gray-500">
              {d.label}: {d.width} × {d.height} мм
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function RoomDetailsSidebar({
  room,
  selectedWallId,
  onSelectWall,
  onClose,
}: RoomDetailsSidebarProps) {
  const selectedWall = room.walls.find((w) => w.id === selectedWallId) ?? null;

  const totalOpenings = room.walls.reduce(
    (acc, w) => acc + w.openings.length,
    0,
  );

  return (
    <aside
      data-testid="room-details-sidebar"
      className="h-full flex flex-col bg-white border-l border-gray-200 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-base">{room.label}</h2>
        <button
          aria-label="Закрыть детали"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="px-4 py-3 space-y-4 flex-1">
        {/* Room stats */}
        <section aria-label="Характеристики комнаты">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {room.area != null && (
              <>
                <span className="text-gray-500">Площадь:</span>
                <span className="font-medium">{room.area.toFixed(2)} м²</span>
              </>
            )}
            <span className="text-gray-500">Периметр:</span>
            <span className="font-medium">{(room.perimeter / 1000).toFixed(2)} м</span>
            {room.volume != null && (
              <>
                <span className="text-gray-500">Объём:</span>
                <span className="font-medium">{room.volume.toFixed(2)} м³</span>
              </>
            )}
            {room.ceilingHeight != null && (
              <>
                <span className="text-gray-500">Высота потолка:</span>
                <span className="font-medium">{room.ceilingHeight.toFixed(2)} м</span>
              </>
            )}
            <span className="text-gray-500">Стен:</span>
            <span className="font-medium">{room.walls.length}</span>
            <span className="text-gray-500">Проёмов:</span>
            <span className="font-medium">{totalOpenings}</span>
          </div>
        </section>

        {/* Walls table */}
        {room.walls.length > 0 && (
          <section aria-label="Таблица стен">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Стены</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-2 py-1 border border-gray-200">Метка</th>
                    <th className="text-right px-2 py-1 border border-gray-200">Длина</th>
                    <th className="text-left px-2 py-1 border border-gray-200">Материал</th>
                    <th className="text-left px-2 py-1 border border-gray-200">Тип</th>
                  </tr>
                </thead>
                <tbody>
                  {room.walls.map((wall) => (
                    <tr
                      key={wall.id}
                      className={`cursor-pointer hover:bg-blue-50 ${
                        selectedWallId === wall.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() =>
                        onSelectWall(selectedWallId === wall.id ? null : wall.id)
                      }
                    >
                      <td className="px-2 py-1 border border-gray-200 font-medium">
                        {wall.label}
                      </td>
                      <td className="px-2 py-1 border border-gray-200 text-right">
                        {(wall.length / 1000).toFixed(3)} м
                      </td>
                      <td className="px-2 py-1 border border-gray-200">
                        {MATERIAL_LABELS[wall.material] ?? wall.material}
                      </td>
                      <td className="px-2 py-1 border border-gray-200">
                        {WALL_TYPE_LABELS[wall.wallType] ?? wall.wallType}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedWall && (
              <WallDetailPanel wall={selectedWall} />
            )}
          </section>
        )}

        {/* Elements table */}
        {room.elements.length > 0 && (
          <section aria-label="Элементы комнаты">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Элементы</h3>
            <div className="space-y-1">
              {room.elements.map((el) => (
                <div
                  key={el.id}
                  className="flex justify-between items-center text-xs px-2 py-1 bg-gray-50 rounded"
                >
                  <span className="font-medium">
                    {ELEMENT_TYPE_LABELS[el.elementType] ?? el.elementType}
                  </span>
                  <span className="text-gray-500">{el.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Curvature */}
        {(room.curvatureMean != null || room.curvatureStdDev != null) && (
          <section aria-label="Кривизна стен">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Кривизна стен</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {room.curvatureMean != null && (
                <>
                  <span className="text-gray-500">Среднее:</span>
                  <span className="font-medium">{room.curvatureMean.toFixed(1)} мм</span>
                </>
              )}
              {room.curvatureStdDev != null && (
                <>
                  <span className="text-gray-500">Отклонение:</span>
                  <span className="font-medium">{room.curvatureStdDev.toFixed(1)} мм</span>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
