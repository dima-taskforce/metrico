import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { Button } from '../../../components/ui/Button';
import type { RoomShape } from '../../../types/api';

const CORNER_COUNT: Record<RoomShape, number> = {
  RECTANGLE: 4,
  L_SHAPE: 6,
  U_SHAPE: 8,
  CUSTOM: 4,
};

const SHAPE_SVG: Record<RoomShape, React.ReactNode> = {
  RECTANGLE: (
    <svg viewBox="0 0 120 80" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="10" y="10" width="100" height="60" className="text-primary-300" />
      <text x="5" y="16" fontSize="10" className="fill-primary-700 font-bold">A</text>
      <text x="112" y="16" fontSize="10" className="fill-primary-700 font-bold">B</text>
      <text x="112" y="76" fontSize="10" className="fill-primary-700 font-bold">C</text>
      <text x="5" y="76" fontSize="10" className="fill-primary-700 font-bold">D</text>
      <circle cx="10" cy="10" r="3" className="fill-primary-500 text-primary-500" />
      <circle cx="110" cy="10" r="3" className="fill-primary-500 text-primary-500" />
      <circle cx="110" cy="70" r="3" className="fill-primary-500 text-primary-500" />
      <circle cx="10" cy="70" r="3" className="fill-primary-500 text-primary-500" />
    </svg>
  ),
  L_SHAPE: (
    <svg viewBox="0 0 120 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="10,90 10,10 70,10 70,50 110,50 110,90 10,90" className="text-primary-300" />
      <text x="3" y="16" fontSize="9" className="fill-primary-700 font-bold">A</text>
      <text x="72" y="16" fontSize="9" className="fill-primary-700 font-bold">B</text>
      <text x="72" y="50" fontSize="9" className="fill-primary-700 font-bold">C</text>
      <text x="112" y="50" fontSize="9" className="fill-primary-700 font-bold">D</text>
      <text x="112" y="96" fontSize="9" className="fill-primary-700 font-bold">E</text>
      <text x="3" y="96" fontSize="9" className="fill-primary-700 font-bold">F</text>
    </svg>
  ),
  U_SHAPE: (
    <svg viewBox="0 0 130 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="10,10 10,90 50,90 50,50 80,50 80,90 120,90 120,10 100,10 100,30 30,30 30,10 10,10" className="text-primary-300" />
      <text x="3" y="14" fontSize="8" className="fill-primary-700 font-bold">A</text>
      <text x="32" y="14" fontSize="8" className="fill-primary-700 font-bold">B</text>
      <text x="32" y="34" fontSize="8" className="fill-primary-700 font-bold">C</text>
      <text x="102" y="34" fontSize="8" className="fill-primary-700 font-bold">D</text>
      <text x="102" y="14" fontSize="8" className="fill-primary-700 font-bold">E</text>
      <text x="120" y="14" fontSize="8" className="fill-primary-700 font-bold">F</text>
      <text x="120" y="95" fontSize="8" className="fill-primary-700 font-bold">G</text>
      <text x="3" y="95" fontSize="8" className="fill-primary-700 font-bold">H</text>
    </svg>
  ),
  CUSTOM: (
    <svg viewBox="0 0 120 80" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="10,70 10,10 80,10 110,40 110,70" className="text-primary-300" />
      <text x="3" y="76" fontSize="9" className="fill-primary-700 font-bold">A</text>
      <text x="3" y="14" fontSize="9" className="fill-primary-700 font-bold">B</text>
      <text x="82" y="14" fontSize="9" className="fill-primary-700 font-bold">C</text>
      <text x="112" y="42" fontSize="9" className="fill-primary-700 font-bold">D</text>
      <text x="112" y="76" fontSize="9" className="fill-primary-700 font-bold">E</text>
    </svg>
  ),
};

const CORNER_LETTERS = 'ABCDEFGH';

export function CornerLabelStep() {
  const { currentRoom, setSubstep } = useRoomMeasureStore();

  if (!currentRoom) return null;

  const cornerCount = CORNER_COUNT[currentRoom.shape];
  const corners = CORNER_LETTERS.slice(0, cornerCount).split('');

  return (
    <div className="p-6 max-w-xl pb-20 sm:pb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">3.1 Разметка углов</h3>
      <p className="text-sm text-gray-500 mb-6">
        Стоя в комнате, выберите левый нижний угол — это угол&nbsp;<strong>A</strong>.
        Далее обходите углы по часовой стрелке: B, C, D…
      </p>

      {/* Shape diagram */}
      <div className="bg-primary-50 rounded-xl p-4 mb-6 h-48 flex items-center justify-center">
        {SHAPE_SVG[currentRoom.shape]}
      </div>

      {/* Corner list */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {corners.map((letter, idx) => (
          <div key={letter} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center">
              {letter}
            </div>
            <span className="text-sm text-gray-700">
              Угол {letter}
              {idx === 0 && ' (левый нижний)'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
        <p className="text-sm text-amber-800">
          <strong>Подсказка:</strong> встаньте спиной к входной двери, левый дальний угол — это угол&nbsp;A.
          Нумеруйте по часовой стрелке.
        </p>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-3 flex justify-end mt-4">
        <Button onClick={() => setSubstep(2)}>Далее → Высота потолка</Button>
      </div>
    </div>
  );
}
