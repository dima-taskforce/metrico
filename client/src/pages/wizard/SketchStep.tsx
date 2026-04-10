import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSketchStore } from '../../stores/sketchStore';
import { sketchApi } from '../../api/sketch';
import { SketchCanvas } from '../../components/sketch/SketchCanvas';
import { SketchToolbar } from '../../components/sketch/SketchToolbar';
import { Button } from '../../components/ui/Button';

export function SketchStep() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const store = useSketchStore();
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('idle');

  // Load existing sketch
  useEffect(() => {
    if (!projectId) return;
    setStatus('loading');
    sketchApi
      .get(projectId)
      .then((json) => {
        if (json) store.loadSketch(JSON.parse(json));
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
    await handleSave();
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
          <Button onClick={handleNext} disabled={store.rooms.length === 0}>
            Далее → Комнаты
          </Button>
        </div>
      </div>
    </div>
  );
}
