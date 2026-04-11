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

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 gap-2">
      {/* Mode tools */}
      <div className="flex gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.mode}
            onClick={() => setMode(tool.mode)}
            className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition min-w-[60px] ${
              mode === tool.mode
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
            }`}
          >
            <span className="text-base leading-none mb-0.5">{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      {/* History + Delete */}
      <div className="flex gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Отменить (Cmd+Z)"
          className="flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition min-w-[56px]
            bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:pointer-events-none"
        >
          <span className="text-base leading-none mb-0.5">↩</span>
          Отмена
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Повторить (Cmd+Shift+Z)"
          className="flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition min-w-[56px]
            bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:pointer-events-none"
        >
          <span className="text-base leading-none mb-0.5">↪</span>
          Повтор
        </button>
        <button
          onClick={handleDelete}
          disabled={!canDelete}
          title="Удалить выбранное (Delete)"
          className="flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition min-w-[60px]
            bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 disabled:opacity-40 disabled:pointer-events-none"
        >
          <span className="text-base leading-none mb-0.5">🗑</span>
          Удалить
        </button>
      </div>
    </div>
  );
}
