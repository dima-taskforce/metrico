import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomsApi } from '../../api/rooms';
import { wallsApi } from '../../api/walls';
import { segmentsApi } from '../../api/segments';
import { openingsApi } from '../../api/openings';
import { elementsApi } from '../../api/elements';
import { photosApi } from '../../api/photos';
import { Button } from '../../components/ui/Button';
import type {
  Room,
  Wall,
  WallSegment,
  WindowOpening,
  DoorOpening,
  RoomElement,
  Photo,
} from '../../types/api';

const ROOM_TYPE_LABELS: Record<string, string> = {
  LIVING: 'Гостиная',
  BEDROOM: 'Спальня',
  KITCHEN: 'Кухня',
  BATHROOM: 'Санузел / Ванная',
  CORRIDOR: 'Коридор / Прихожая',
  BALCONY: 'Балкон / Лоджия',
  STORAGE: 'Кладовая',
  OTHER: 'Другое',
  KITCHEN_LIVING: 'Кухня-гостиная',
  LAUNDRY: 'Постирочная',
  OFFICE: 'Кабинет',
  LIBRARY: 'Библиотека',
};

const SHAPE_LABELS: Record<string, string> = {
  RECTANGLE: 'Прямоугольник',
  L_SHAPE: 'Г-образная',
  U_SHAPE: 'П-образная',
  T_SHAPE: 'Т-образная',
  CUSTOM: 'Произвольная',
};

const MATERIAL_LABELS: Record<string, string> = {
  CONCRETE: 'Бетон',
  DRYWALL: 'Гипсокартон',
  BRICK: 'Кирпич',
  OTHER: 'Другое',
};

const WALL_TYPE_LABELS: Record<string, string> = {
  EXTERNAL: 'Внешняя',
  INTERNAL: 'Внутренняя',
  ADJACENT: 'Смежная',
};

const SEGMENT_TYPE_LABELS: Record<string, string> = {
  PLAIN: 'Стена',
  WINDOW: 'Окно',
  DOOR: 'Дверь',
  PROTRUSION: 'Выступ',
  NICHE: 'Ниша',
  PARTITION: 'Перегородка',
  STEP: 'Ступень',
};

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  COLUMN: 'Колонна',
  VENT_SHAFT: 'Вент. короб',
  RADIATOR: 'Радиатор',
  ELECTRICAL_PANEL: 'Эл. щит',
  LOW_VOLTAGE_PANEL: 'Слаботочный щит',
  PIPE: 'Труба',
};

interface WallData {
  wall: Wall;
  segments: WallSegment[];
  windows: WindowOpening[];
  doors: DoorOpening[];
}

function fmt(v: number | null | undefined, unit = 'м'): string {
  if (v == null) return '—';
  return `${v.toFixed(2)} ${unit}`;
}

function PhotoThumb({ path, alt }: { path: string; alt: string }) {
  return (
    <img
      src={`/api/uploads/${path.replace(/^uploads\//, '')}`}
      alt={alt}
      className="w-20 h-20 object-cover rounded border border-gray-200"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

function WallCard({ data }: { data: WallData }) {
  const { wall, segments, windows, doors } = data;

  const hasCurvature =
    wall.curvatureBottom != null ||
    wall.curvatureMiddle != null ||
    wall.curvatureTop != null;

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 text-sm">
          {wall.label}
        </h4>
        <span className="text-xs text-gray-500">
          {WALL_TYPE_LABELS[wall.wallType] ?? wall.wallType} ·{' '}
          {MATERIAL_LABELS[wall.material] ?? wall.material}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-gray-500">Длина</span>
        <span className="font-medium">{fmt(wall.length)}</span>

        {hasCurvature && (
          <>
            <span className="text-gray-500">Кривизна (низ/ср/верх)</span>
            <span className="font-medium">
              {fmt(wall.curvatureBottom, 'мм')} /{' '}
              {fmt(wall.curvatureMiddle, 'мм')} /{' '}
              {fmt(wall.curvatureTop, 'мм')}
            </span>
          </>
        )}
      </div>

      {segments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Развёртка:</p>
          <div className="flex flex-wrap gap-1">
            {segments.map((seg) => (
              <span
                key={seg.id}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
              >
                {SEGMENT_TYPE_LABELS[seg.segmentType] ?? seg.segmentType}{' '}
                {seg.length.toFixed(2)} м
              </span>
            ))}
          </div>
        </div>
      )}

      {windows.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Окна ({windows.length}):</p>
          <div className="space-y-1">
            {windows.map((w) => (
              <p key={w.id} className="text-xs text-gray-700">
                {fmt(w.width)} × {fmt(w.height)}, подоконник {fmt(w.sillHeightFromScreed)} от чернового пола
              </p>
            ))}
          </div>
        </div>
      )}

      {doors.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Двери ({doors.length}):</p>
          <div className="space-y-1">
            {doors.map((d) => (
              <p key={d.id} className="text-xs text-gray-700">
                {fmt(d.width)} × {fmt(d.heightFromScreed)}
                {d.isFrenchDoor ? ' (французская)' : ''}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RoomViewPage() {
  const { projectId, roomId } = useParams<{ projectId: string; roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [wallData, setWallData] = useState<WallData[]>([]);
  const [elements, setElements] = useState<RoomElement[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !roomId) return;

    const load = async () => {
      try {
        const [roomData, wallList, elementList, photoList] = await Promise.all([
          roomsApi.get(projectId, roomId),
          wallsApi.list(roomId),
          elementsApi.list(roomId),
          photosApi.list(roomId),
        ]);

        setRoom(roomData);
        setElements(elementList);
        setPhotos(photoList);

        const wallDataList = await Promise.all(
          wallList.map(async (wall) => {
            const [segs, wins, drs] = await Promise.all([
              segmentsApi.list(wall.id),
              openingsApi.windows.list(wall.id),
              openingsApi.doors.list(wall.id),
            ]);
            return { wall, segments: segs, windows: wins, doors: drs };
          }),
        );

        setWallData(wallDataList.sort((a, b) => a.wall.sortOrder - b.wall.sortOrder));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [projectId, roomId]);

  const handleBack = () => navigate(`/wizard/${projectId}/rooms`);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Загрузка…</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">{error ?? 'Комната не найдена'}</p>
        <Button onClick={handleBack}>Назад</Button>
      </div>
    );
  }

  const hasCeiling = room.ceilingHeight1 != null;
  const overviewPhoto = photos.find((p) => p.photoType === 'OVERVIEW_BEFORE');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="text-gray-500 hover:text-gray-700 p-1 rounded transition-colors"
          aria-label="Назад к комнатам"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">{room.name}</h2>
          <p className="text-xs text-gray-500">
            {ROOM_TYPE_LABELS[room.type] ?? room.type} · {SHAPE_LABELS[room.shape] ?? room.shape}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex-shrink-0">
          Замерена
        </span>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-24 space-y-5">
        {/* General info */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Общие параметры</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {hasCeiling && (
              <>
                <span className="text-gray-500">Высота потолка</span>
                <span className="font-medium">
                  {fmt(room.ceilingHeight1)}
                  {room.ceilingHeight2 != null && room.ceilingHeight2 !== room.ceilingHeight1
                    ? ` / ${fmt(room.ceilingHeight2)}`
                    : ''}
                </span>
              </>
            )}
          </div>
          {overviewPhoto && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Общий вид</p>
              <PhotoThumb path={overviewPhoto.originalPath} alt="Общий вид комнаты" />
            </div>
          )}
        </section>

        {/* Walls */}
        {wallData.length > 0 && (
          <section>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">
              Стены ({wallData.length})
            </h3>
            <div className="space-y-3">
              {wallData.map((wd) => (
                <WallCard key={wd.wall.id} data={wd} />
              ))}
            </div>
          </section>
        )}

        {/* Elements */}
        {elements.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">
              Элементы ({elements.length})
            </h3>
            <div className="space-y-2">
              {elements.map((el) => (
                <div key={el.id} className="flex items-start gap-2 text-sm">
                  <span className="text-gray-500 min-w-0 flex-shrink-0">
                    {ELEMENT_TYPE_LABELS[el.elementType] ?? el.elementType}
                  </span>
                  <span className="text-gray-700">
                    {el.width != null && `${fmt(el.width)}`}
                    {el.height != null && ` × ${fmt(el.height)}`}
                    {el.description ? ` — ${el.description}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">
              Фото ({photos.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {photos.map((ph) => (
                <PhotoThumb key={ph.id} path={ph.originalPath} alt={ph.photoType} />
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={handleBack} className="flex-1">
            ← К списку комнат
          </Button>
          <Button
            onClick={() => navigate(`/wizard/${projectId}/rooms/${roomId}/measure`)}
            className="flex-1"
          >
            Изменить замер
          </Button>
        </div>
      </div>
    </div>
  );
}
