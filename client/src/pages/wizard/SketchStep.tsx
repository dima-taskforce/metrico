import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSketchStore } from '../../stores/sketchStore';
import { sketchApi } from '../../api/sketch';
import { roomsApi } from '../../api/rooms';
import { SketchCanvas } from '../../components/sketch/SketchCanvas';
import { SketchToolbar } from '../../components/sketch/SketchToolbar';
import { Button } from '../../components/ui/Button';
import type { RoomShape } from '../../types/api';

function shapeFromCornerCount(count: number): RoomShape {
  if (count === 4) return 'RECTANGLE';
  if (count === 6) return 'L_SHAPE';
  if (count >= 8) return 'U_SHAPE';
  return 'CUSTOM';
}

export function SketchStep() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const store = useSketchStore();
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('idle');

  // Refs so the unmount cleanup always captures the latest values
  const storeRef = useRef(store);
  storeRef.current = store;
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  // Auto-save when the user navigates away (back, sidebar, etc.)
  useEffect(() => {
    return () => {
      const pid = projectIdRef.current;
      const s = storeRef.current;
      const data = s.toSketchData();
      if (pid && (data.nodes.length > 0 || data.rooms.length > 0)) {
        sketchApi.save(pid, JSON.stringify(data));
      }
    };
  }, []);

  // Load existing sketch; reset first so a new project never shows stale data
  useEffect(() => {
    if (!projectId) return;
    store.reset();
    setStatus('loading');
    sketchApi
      .get(projectId)
      .then((data) => {
        if (data) store.loadSketch(data);
        setStatus('idle');
      })
      .catch(() => setStatus('idle'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleSave = async () => {
    if (!projectId) return;
    setStatus('saving');
    try {
      await sketchApi.save(projectId, JSON.stringify(store.toSketchData()));
      setStatus('idle');
    } catch {
      setStatus('idle');
    }
  };

  const handleNext = async () => {
    if (!projectId) return;
    setStatus('saving');
    try {
      // Sync sketch rooms → API rooms for any room not yet created
      const sketchRooms = store.rooms;
      for (let i = 0; i < sketchRooms.length; i++) {
        const sr = sketchRooms[i]!;
        if (!sr.roomId) {
          const room = await roomsApi.create(projectId, {
            name: sr.label,
            type: sr.type,
            shape: shapeFromCornerCount(sr.nodeIds.length),
            sortOrder: i,
          });
          store.updateRoom(sr.id, { roomId: room.id });
        }
      }
      await sketchApi.save(projectId, JSON.stringify(store.toSketchData()));
      setStatus('idle');
    } catch {
      setStatus('idle');
    }
    navigate(`/wizard/${projectId}/rooms`);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Загрузка эскиза…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Эскиз плана</h2>
        <p className="text-xs text-gray-500">
          Нарисуйте план квартиры пальцем: тапайте углы, проводите стены
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <SketchCanvas />
      </div>

      {/* Toolbar */}
      <SketchToolbar />

      {/* Navigation */}
      <div className="px-4 py-3 border-t border-gray-200 flex justify-between">
        <Button variant="secondary" onClick={() => navigate(`/wizard/${projectId}/info`)}>
          ← Назад
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSave} disabled={status === 'saving'}>
            {status === 'saving' ? 'Сохранение…' : 'Сохранить'}
          </Button>
          <Button onClick={handleNext} disabled={status === 'saving' || store.rooms.length === 0}>
            {status === 'saving' ? 'Сохранение…' : 'Далее → Комнаты'}
          </Button>
        </div>
      </div>
    </div>
  );
}
