import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { photosApi } from '../../../api/photos';
import { roomsApi } from '../../../api/rooms';
import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { Button } from '../../../components/ui/Button';
import { MeasurementHint } from '../../../components/MeasurementHint';
import type { Photo } from '../../../types/api';

function CheckItem({
  label,
  checked,
  required = false,
  manual = false,
  onChange,
}: {
  label: ReactNode;
  checked: boolean;
  required?: boolean;
  manual?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      {manual ? (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="w-4 h-4 accent-primary-600 flex-shrink-0"
        />
      ) : (
        <div
          className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${
            checked ? 'bg-green-500' : 'bg-gray-200'
          }`}
        >
          {checked && (
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth="1.5">
              <polyline points="1.5,5 4,7.5 8.5,2" />
            </svg>
          )}
        </div>
      )}
      <span className={`text-sm flex-1 ${checked ? 'text-gray-800' : 'text-gray-500'}`}>
        {label}
      </span>
      {required && !checked && (
        <span className="text-xs text-amber-600 font-medium">обязательно</span>
      )}
    </div>
  );
}

export function PhotoChecklistStep() {
  const { projectId, roomId } = useParams<{ projectId: string; roomId: string }>();
  const navigate = useNavigate();
  const { walls, segments, windows, doors, elements, setSubstep } = useRoomMeasureStore();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [uploading, setUploading] = useState<'overview' | 'detail' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [markingDone, setMarkingDone] = useState(false);
  const [manualChecks, setManualChecks] = useState({
    curvatureChecked: false,
    elementsPlaced: false,
  });
  const overviewInputRef = useRef<HTMLInputElement>(null);
  const detailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!roomId) return;
    photosApi
      .list(roomId)
      .then(setPhotos)
      .catch(() => {})
      .finally(() => setPhotosLoading(false));
  }, [roomId]);

  const overviewPhotos = photos.filter((p) => p.photoType === 'OVERVIEW_BEFORE');
  const detailPhotos = photos.filter((p) => p.photoType === 'DETAIL');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'OVERVIEW_BEFORE' | 'DETAIL') => {
    const file = e.target.files?.[0];
    if (!file || !roomId) return;
    setUploading(type === 'OVERVIEW_BEFORE' ? 'overview' : 'detail');
    setUploadError(null);
    try {
      const uploaded = await photosApi.upload(roomId, file, type);
      setPhotos((prev) => [...prev, uploaded]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(null);
      const ref = type === 'OVERVIEW_BEFORE' ? overviewInputRef : detailInputRef;
      if (ref.current) ref.current.value = '';
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    await photosApi.remove(photoId).catch(() => {});
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  // Auto-check conditions
  const hasPhoto = overviewPhotos.length > 0;
  const hasWalls = walls.length > 0;
  const allWallsHaveSegments =
    walls.length > 0 && walls.every((w) => (segments[w.id] ?? []).length > 0);
  const allOpeningsMeasured = walls.every((w) => {
    const wins = windows[w.id] ?? [];
    const drs = doors[w.id] ?? [];
    return (
      wins.every((win) => win.height > 0) &&
      drs.every((door) => door.heightFromScreed > 0)
    );
  });
  const hasElements = elements.length > 0;

  const wallsMissingSegments = walls.filter((w) => (segments[w.id] ?? []).length === 0);

  const canMarkDone =
    hasPhoto &&
    hasWalls &&
    allWallsHaveSegments &&
    allOpeningsMeasured &&
    manualChecks.curvatureChecked &&
    manualChecks.elementsPlaced;

  const handleMarkDone = async () => {
    if (!projectId || !roomId) return;
    setMarkingDone(true);
    try {
      await roomsApi.update(projectId, roomId, { isMeasured: true });
      navigate(`/wizard/${projectId}/rooms`);
    } catch {
      setMarkingDone(false);
    }
  };

  return (
    <div className="p-6 max-w-xl pb-20 sm:pb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">3.7 Фото и чеклист</h3>
      <p className="text-sm text-gray-500 mb-3">
        Сделайте общее фото комнаты и убедитесь, что все замеры выполнены.
      </p>
      <MeasurementHint stepKey="room-photo" className="mb-4" />

      {/* Photo upload section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Общее фото (до ремонта)
          <span className="text-amber-600 ml-1 text-xs">обязательно</span>
        </p>

        {photosLoading ? (
          <p className="text-sm text-gray-400 mb-3">Загрузка…</p>
        ) : overviewPhotos.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {overviewPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.thumbPath ?? photo.originalPath}
                  alt="общий вид"
                  className="w-24 h-24 object-cover rounded-md border border-gray-200"
                  onError={(e) => { e.currentTarget.src = photo.originalPath; }}
                />
                <button
                  className="absolute top-1 right-1 bg-white/90 rounded-full w-5 h-5 text-xs text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemovePhoto(photo.id)}
                  aria-label="Удалить фото"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 h-24 flex items-center justify-center mb-3">
            <p className="text-sm text-gray-400">Фото не добавлено</p>
          </div>
        )}

        <input
          ref={overviewInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleUpload(e, 'OVERVIEW_BEFORE')}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={uploading !== null}
          onClick={() => overviewInputRef.current?.click()}
        >
          {uploading === 'overview' ? 'Загрузка…' : '+ Добавить фото'}
        </Button>
        {uploadError && (
          <p className="text-xs text-red-500 mt-2">{uploadError}</p>
        )}
      </div>

      {/* Detail photos */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Детальные фото (проблемные места, ниши, трубы…)
        </p>
        {!photosLoading && detailPhotos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {detailPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.thumbPath ?? photo.originalPath}
                  alt="деталь"
                  className="w-24 h-24 object-cover rounded-md border border-gray-200"
                  onError={(e) => { e.currentTarget.src = photo.originalPath; }}
                />
                <button
                  className="absolute top-1 right-1 bg-white/90 rounded-full w-5 h-5 text-xs text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemovePhoto(photo.id)}
                  aria-label="Удалить фото"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={detailInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleUpload(e, 'DETAIL')}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={uploading !== null}
          onClick={() => detailInputRef.current?.click()}
        >
          {uploading === 'detail' ? 'Загрузка…' : '+ Добавить фото'}
        </Button>
      </div>

      {/* Checklist */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Чеклист</p>
        <div className="divide-y divide-gray-100">
          <CheckItem
            label="Общее фото сделано"
            checked={hasPhoto}
            required
          />
          <CheckItem
            label={`Стены добавлены (${walls.length} шт.)`}
            checked={hasWalls}
            required
          />
          <CheckItem
            label={
              allWallsHaveSegments
                ? 'Все стены разбиты на сегменты'
                : wallsMissingSegments.length === 1
                  ? `Стена «${wallsMissingSegments[0]?.label}» — добавьте хотя бы один сегмент`
                  : `${wallsMissingSegments.length} стены без сегментов (${wallsMissingSegments.map((w) => w.label).join(', ')})`
            }
            checked={allWallsHaveSegments}
            required
          />
          <CheckItem
            label="Размеры проёмов указаны"
            checked={allOpeningsMeasured}
          />
          <CheckItem
            label={`Элементы отмечены (${elements.length} шт.)`}
            checked={hasElements}
          />
          <CheckItem
            label="Кривизна стен проверена"
            checked={manualChecks.curvatureChecked}
            required
            manual
            onChange={(v) => setManualChecks((c) => ({ ...c, curvatureChecked: v }))}
          />
          <CheckItem
            label="Все элементы (радиаторы, вент-шахты…) отмечены на развёртке"
            checked={manualChecks.elementsPlaced}
            required
            manual
            onChange={(v) => setManualChecks((c) => ({ ...c, elementsPlaced: v }))}
          />
        </div>
      </div>

      {!canMarkDone && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-amber-800 mb-1">Осталось выполнить:</p>
          <ul className="text-sm text-amber-700 space-y-0.5 list-disc list-inside">
            {!hasPhoto && <li>Загрузить общее фото комнаты</li>}
            {!hasWalls && <li>Добавить стены</li>}
            {!allWallsHaveSegments && wallsMissingSegments.length > 0 && (
              <li>
                Добавить сегменты для стен:{' '}
                <span className="font-medium">{wallsMissingSegments.map((w) => w.label).join(', ')}</span>
                {' '}(для сплошной стены добавьте один сегмент типа «Без особенностей»)
              </li>
            )}
            {!allOpeningsMeasured && <li>Указать размеры всех проёмов</li>}
            {!manualChecks.curvatureChecked && <li>Подтвердить проверку кривизны стен</li>}
            {!manualChecks.elementsPlaced && <li>Подтвердить отметку всех элементов на развёртке</li>}
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-3 flex justify-between items-center mt-4">
        <Button variant="secondary" onClick={() => setSubstep(6)}>
          ← Назад
        </Button>
        <Button disabled={!canMarkDone || markingDone} onClick={handleMarkDone}>
          {markingDone ? 'Сохранение…' : 'Готово с комнатой ✓'}
        </Button>
      </div>
    </div>
  );
}
