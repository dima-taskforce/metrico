import { useEffect } from 'react';
import { useSketchStore } from '../../stores/sketchStore';

type ToolMode = 'draw' | 'select' | 'room';

const TOOLS: { mode: ToolMode; label: string; icon: string }[] = [
  { mode: 'draw', label: 'Стены', icon: '✏️' },
  { mode: 'select', label: 'Двигать', icon: '↔' },
  { mode: 'room', label: 'Комнаты', icon: '🏠' },
];

export function SketchToolbar() {
  const {
    mode, setMode,
    selectedNodeId, selectedEdgeId, activeNodeId,
    removeNode, removeEdge,
    past, future, undo, redo,
  } = useSketchStore();

  const canDelete = selectedNodeId !== null || selectedEdgeId !== null || activeNodeId !== null;
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const handleDelete = () => {
    if (selectedNodeId) removeNode(selectedNodeId);
    else if (selectedEdgeId) removeEdge(selectedEdgeId);
    else if (activeNodeId) {
      removeNode(activeNodeId);
      useSketchStore.setState({ activeNodeId: null });
    }
  };

  // Keyboard shortcuts: Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z = redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const btnBase = 'flex flex-col items-center flex-1 py-2 rounded-lg text-xs font-medium transition';

  return (
    <div className="bg-white border-t border-gray-200 px-2 pb-1">
      {/* Row 1: mode tools */}
      <div className="flex gap-1 pt-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.mode}
            onClick={() => setMode(tool.mode)}
            className={`${btnBase} ${
              mode === tool.mode
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 active:bg-gray-300'
            }`}
          >
            <span className="text-base leading-none mb-0.5">{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      {/* Row 2: history + delete */}
      <div className="flex gap-1 pt-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Отменить (Cmd+Z)"
          className={`${btnBase} bg-gray-100 text-gray-700 active:bg-gray-300 disabled:opacity-40 disabled:pointer-events-none`}
        >
          <span className="text-base leading-none mb-0.5">↩</span>
          Отмена
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Повторить (Cmd+Shift+Z)"
          className={`${btnBase} bg-gray-100 text-gray-700 active:bg-gray-300 disabled:opacity-40 disabled:pointer-events-none`}
        >
          <span className="text-base leading-none mb-0.5">↪</span>
          Повтор
        </button>
        <button
          onClick={handleDelete}
          disabled={!canDelete}
          title="Удалить выбранное (Delete)"
          className={`${btnBase} bg-red-50 text-red-600 active:bg-red-200 disabled:opacity-40 disabled:pointer-events-none`}
        >
          <span className="text-base leading-none mb-0.5">🗑</span>
          Удалить
        </button>
      </div>
    </div>
  );
}
