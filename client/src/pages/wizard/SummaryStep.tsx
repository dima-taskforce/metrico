import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomsApi } from '../../api/rooms';
import { wallsApi } from '../../api/walls';
import { anglesApi } from '../../api/angles';
import { photosApi } from '../../api/photos';
import { useProjectsStore } from '../../stores/projectsStore';
import { Button } from '../../components/ui/Button';
import { RoomTypeIcon } from '../../components/RoomTypeIcon';
import type { Room, Wall, Angle, Photo } from '../../types/api';

const ROOM_TYPE_LABELS: Record<string, string> = {
  LIVING: 'Гостиная',
  BEDROOM: 'Спальня',
  KITCHEN: 'Кухня',
  BATHROOM: 'Санузел / Ванная',
  CORRIDOR: 'Коридор / Прихожая',
  BALCONY: 'Балкон / Лоджия',
  STORAGE: 'Кладовая',
  OTHER: 'Другое',
};


interface RoomStats {
  area: number | null; // mm²
  perimeter: number; // mm
  volume: number | null; // mm³
  wallCount: number;
  windowCount: number;
  doorCount: number;
  ceilingHeight: number | null; // mm
}

interface Point {
  x: number;
  y: number;
}

/**
 * Compute perimeter — sum of all wall lengths (mm).
 */
function computePerimeter(walls: Wall[]): number {
  return walls.reduce((sum, w) => sum + w.length, 0);
}

/**
 * Compute area using Shoelace formula for arbitrary polygons.
 */
function computeArea(walls: Wall[], angles: Angle[]): number | null {
  if (walls.length < 2) return null;

  const sorted = [...walls].sort((a, b) => a.sortOrder - b.sortOrder);

  // Special case for rectangles: 2+ walls
  if (sorted.length === 2) {
    const a = sorted[0]!.length;
    const b = sorted[1]!.length;
    return a * b;
  }

  // Complex shape: reconstruct vertices
  const vertices: Point[] = [];
  let x = 0;
  let y = 0;
  let direction = 0; // degrees, 0 = rightward

  vertices.push({ x, y });

  for (let i = 0; i < sorted.length; i++) {
    const wall = sorted[i]!;
    const length = wall.length;

    // Move in current direction
    const radians = (direction * Math.PI) / 180;
    x += length * Math.cos(radians);
    y += length * Math.sin(radians);

    vertices.push({ x, y });

    // Find angle at corner (between wall[i] and wall[i+1])
    if (i < sorted.length - 1) {
      const nextWall = sorted[i + 1]!;
      const angle = angles.find(
        (a) =>
          (a.wallAId === wall.id && a.wallBId === nextWall.id) ||
          (a.wallBId === wall.id && a.wallAId === nextWall.id),
      );

      if (angle) {
        if (angle.isRightAngle) {
          direction -= 90; // clockwise turn
        } else if (angle.angleDegrees !== null) {
          direction -= angle.angleDegrees; // use explicit angle
        }
      } else {
        // Default to right angle if no angle record
        direction -= 90;
      }

      // Normalize direction to [0, 360)
      direction = ((direction % 360) + 360) % 360;
    }
  }

  // Remove last duplicate point if it closes the polygon
  if (vertices.length > 1) {
    const first = vertices[0]!;
    const last = vertices[vertices.length - 1]!;
    if (Math.abs(first.x - last.x) < 0.001 && Math.abs(first.y - last.y) < 0.001) {
      vertices.pop();
    }
  }

  // Apply Shoelace formula
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i]!;
    const next = vertices[(i + 1) % vertices.length]!;
    sum += current.x * next.y - next.x * current.y;
  }

  const area = Math.abs(sum) / 2;
  return area;
}

/**
 * Compute volume (mm³).
 */
function computeVolume(
  area: number | null,
  ceilingHeight1Mm: number | null,
  ceilingHeight2Mm?: number | null,
): number | null {
  if (area === null) return null;
  if (ceilingHeight1Mm === null) return null;

  if (ceilingHeight2Mm !== null && ceilingHeight2Mm !== undefined) {
    const avgHeight = (ceilingHeight1Mm + ceilingHeight2Mm) / 2;
    return area * avgHeight;
  }

  return area * ceilingHeight1Mm;
}

/**
 * Count window and door openings in walls
 */
async function countOpenings(walls: Wall[]) {
  let windowCount = 0;
  let doorCount = 0;

  // Load openings for each wall (this is a simplified approach)
  // In a real scenario, we might fetch all openings at once
  for (const wall of walls) {
    try {
      const segments = await fetch(`/api/walls/${wall.id}/segments`, {
        credentials: 'include',
      }).then((r) => r.json());

      if (Array.isArray(segments)) {
        for (const seg of segments) {
          if (seg.windowOpeningId) windowCount++;
          if (seg.doorOpeningId) doorCount++;
        }
      }
    } catch {
      // Silently skip errors
    }
  }

  return { windowCount, doorCount };
}

async function loadRoomStats(room: Room, projectId: string): Promise<RoomStats> {
  try {
    const [walls, angles, openingsData] = await Promise.all([
      wallsApi.list(room.id),
      anglesApi.list(room.id),
      countOpenings([]), // Start with empty to avoid premature calls
    ]);

    // Load openings properly
    const { windowCount, doorCount } = await countOpenings(walls);

    const area = computeArea(walls, angles);
    const perimeter = computePerimeter(walls);
    const h1Mm = room.ceilingHeight1 !== null ? Math.round(room.ceilingHeight1 * 1000) : null;
    const h2Mm = room.ceilingHeight2 !== null ? Math.round(room.ceilingHeight2 * 1000) : null;
    const volume = computeVolume(area, h1Mm, h2Mm);

    return {
      area,
      perimeter,
      volume,
      wallCount: walls.length,
      windowCount,
      doorCount,
      ceilingHeight: h1Mm,
    };
  } catch {
    return {
      area: null,
      perimeter: 0,
      volume: null,
      wallCount: 0,
      windowCount: 0,
      doorCount: 0,
      ceilingHeight: null,
    };
  }
}

function RoomRow({
  room,
  stats,
  onRowClick,
}: {
  room: Room;
  stats: RoomStats;
  onRowClick: (roomId: string) => void;
}) {
  const typeName = ROOM_TYPE_LABELS[room.type] || room.type;

  const areaM2 = stats.area !== null ? (stats.area / 1_000_000).toFixed(2) : '—';
  const perimeterM = (stats.perimeter / 1000).toFixed(2);
  const volumeM3 = stats.volume !== null ? (stats.volume / 1_000_000_000).toFixed(2) : '—';

  return (
    <tr
      onClick={() => onRowClick(room.id)}
      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-primary-500" aria-label={`icon-${room.type}`}><RoomTypeIcon type={room.type} size={18} /></span>
          <span className="font-medium text-gray-900">{room.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {typeName}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
        {areaM2}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
        {perimeterM}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
        {volumeM3}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900">
        {stats.wallCount}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900">
        {stats.windowCount}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900">
        {stats.doorCount}
      </td>
    </tr>
  );
}

export function SummaryStep() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectsStore();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomStats, setRoomStats] = useState<Map<string, RoomStats>>(new Map());
  const [roomPhotos, setRoomPhotos] = useState<Map<string, Photo[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    async function loadData() {
      try {
        const loadedRooms = await roomsApi.list(projectId!);
        setRooms(loadedRooms);

        // Load stats and photos for each room in parallel
        const statsMap = new Map<string, RoomStats>();
        const photosMap = new Map<string, Photo[]>();

        const pid = projectId!; // Capture projectId for closure

        await Promise.all(
          loadedRooms.map(async (room) => {
            const stats = await loadRoomStats(room, pid);
            statsMap.set(room.id, stats);

            try {
              const photos = await photosApi.list(room.id);
              photosMap.set(room.id, photos);
            } catch {
              photosMap.set(room.id, []);
            }
          }),
        );

        setRoomStats(statsMap);
        setRoomPhotos(photosMap);
      } catch (err) {
        console.error('Failed to load summary data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [projectId]);

  const unmeasuredRooms = rooms.filter((r) => !r.isMeasured);
  const roomsWithoutPhotos = rooms.filter((r) => {
    const photos = roomPhotos.get(r.id) || [];
    return photos.length === 0;
  });

  const totalArea = Array.from(roomStats.values()).reduce((sum, s) => {
    if (s.area === null) return sum;
    return sum + s.area;
  }, 0);
  const totalAreaM2 = (totalArea / 1_000_000).toFixed(2);

  const avgCeilingHeight = (() => {
    const heights = rooms
      .map((r) => r.ceilingHeight1)
      .filter((h) => h !== null) as number[];
    if (heights.length === 0) return null;
    return (heights.reduce((a, b) => a + b, 0) / heights.length).toFixed(2);
  })();

  const handleRowClick = (roomId: string) => {
    if (projectId) {
      navigate(`/wizard/${projectId}/rooms/${roomId}/measure`);
    }
  };

  const handleGeneratePlan = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/plan`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl">
        <p className="text-sm text-gray-500">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Сводка по комнатам</h2>
        {currentProject && (
          <p className="text-sm text-gray-500 mt-1">{currentProject.name}</p>
        )}
      </div>

      {/* Warnings */}
      <div className="space-y-3 mb-6">
        {unmeasuredRooms.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <span className="font-medium">⚠ Незамеренные комнаты:</span>
            <ul className="mt-1 ml-4 list-disc">
              {unmeasuredRooms.map((r) => (
                <li key={r.id}>{r.name}</li>
              ))}
            </ul>
          </div>
        )}

        {roomsWithoutPhotos.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <span className="font-medium">⚠ Комнаты без фотографий:</span>
            <ul className="mt-1 ml-4 list-disc">
              {roomsWithoutPhotos.map((r) => (
                <li key={r.id}>{r.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Summary table */}
      <div className="overflow-x-auto mb-6 bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Название
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Тип
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                Площадь (м²)
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                Периметр (м)
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                Объём (м³)
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                Стен
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                Окон
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                Дверей
              </th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                stats={roomStats.get(room.id) || {
                  area: null,
                  perimeter: 0,
                  volume: null,
                  wallCount: 0,
                  windowCount: 0,
                  doorCount: 0,
                  ceilingHeight: null,
                }}
                onRowClick={handleRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary totals */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Суммарная площадь</p>
          <p className="text-2xl font-semibold text-blue-900 mt-1">{totalAreaM2} м²</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Средняя высота потолков</p>
          <p className="text-2xl font-semibold text-blue-900 mt-1">
            {avgCeilingHeight ? `${avgCeilingHeight} м` : '—'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-100">
        <Button
          variant="secondary"
          onClick={() => navigate(`/wizard/${projectId}/rooms`)}
        >
          ← Назад
        </Button>
        <Button onClick={handleGeneratePlan}>
          Сформировать обмерный план →
        </Button>
      </div>
    </div>
  );
}
