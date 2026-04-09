import { useRoomMeasureStore } from '../../../stores/roomMeasureStore';
import { Button } from '../../../components/ui/Button';
import type { RoomShape } from '../../../types/api';

const ROTATION_DEG: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 90, 2: 180, 3: 270 };

const CORNER_COUNT: Record<RoomShape, number> = {
  RECTANGLE: 4,
  L_SHAPE: 6,
  U_SHAPE: 8,
  CUSTOM: 4,
};

const SHAPE_SVG: Record<RoomShape, React.ReactNode> = {
  // A = нижний левый, далее по часовой стрелке (вдоль левой стены вверх)
  RECTANGLE: (
    <svg viewBox="0 0 126 92" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="14" y="12" width="96" height="60" className="text-primary-300" />
      {/* corners: BL, TL, TR, BR */}
      <circle cx="14" cy="72" r="3" className="fill-primary-500" />
      <circle cx="14" cy="12" r="3" className="fill-primary-500" />
      <circle cx="110" cy="12" r="3" className="fill-primary-500" />
      <circle cx="110" cy="72" r="3" className="fill-primary-500" />
      {/* labels: outside corners */}
      <text x="2"   y="86"  fontSize="11" className="fill-primary-700">A</text>
      <text x="2"   y="9"   fontSize="11" className="fill-primary-700">B</text>
      <text x="114" y="9"   fontSize="11" className="fill-primary-700">C</text>
      <text x="114" y="86"  fontSize="11" className="fill-primary-700">D</text>
    </svg>
  ),
  L_SHAPE: (
    <svg viewBox="0 0 126 112" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="12,100 12,10 72,10 72,50 112,50 112,100 12,100" className="text-primary-300" />
      <circle cx="12"  cy="100" r="3" className="fill-primary-500" />
      <circle cx="12"  cy="10"  r="3" className="fill-primary-500" />
      <circle cx="72"  cy="10"  r="3" className="fill-primary-500" />
      <circle cx="72"  cy="50"  r="3" className="fill-primary-500" />
      <circle cx="112" cy="50"  r="3" className="fill-primary-500" />
      <circle cx="112" cy="100" r="3" className="fill-primary-500" />
      <text x="0"   y="111" fontSize="10" className="fill-primary-700">A</text>
      <text x="0"   y="7"   fontSize="10" className="fill-primary-700">B</text>
      <text x="74"  y="7"   fontSize="10" className="fill-primary-700">C</text>
      <text x="55"  y="62"  fontSize="10" className="fill-primary-700">D</text>
      <text x="115" y="62"  fontSize="10" className="fill-primary-700">E</text>
      <text x="115" y="111" fontSize="10" className="fill-primary-700">F</text>
    </svg>
  ),
  U_SHAPE: (
    <svg viewBox="0 0 148 106" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      {/* П-shape: A=BL, clockwise. Opening at bottom-center */}
      <polygon points="10,90 10,10 130,10 130,90 100,90 100,40 40,40 40,90" className="text-primary-300" />
      <circle cx="10"  cy="90" r="3" className="fill-primary-500" />
      <circle cx="10"  cy="10" r="3" className="fill-primary-500" />
      <circle cx="130" cy="10" r="3" className="fill-primary-500" />
      <circle cx="130" cy="90" r="3" className="fill-primary-500" />
      <circle cx="100" cy="90" r="3" className="fill-primary-500" />
      <circle cx="100" cy="40" r="3" className="fill-primary-500" />
      <circle cx="40"  cy="40" r="3" className="fill-primary-500" />
      <circle cx="40"  cy="90" r="3" className="fill-primary-500" />
      <text x="0"   y="103" fontSize="9" className="fill-primary-700">A</text>
      <text x="0"   y="7"   fontSize="9" className="fill-primary-700">B</text>
      <text x="133" y="7"   fontSize="9" className="fill-primary-700">C</text>
      <text x="133" y="103" fontSize="9" className="fill-primary-700">D</text>
      <text x="88"  y="103" fontSize="9" className="fill-primary-700">E</text>
      <text x="103" y="43"  fontSize="9" className="fill-primary-700">F</text>
      <text x="26"  y="43"  fontSize="9" className="fill-primary-700">G</text>
      <text x="26"  y="103" fontSize="9" className="fill-primary-700">H</text>
    </svg>
  ),
  CUSTOM: (
    <svg viewBox="0 0 126 92" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,72 12,10 82,10 112,40 112,72" className="text-primary-300" />
      <circle cx="12"  cy="72" r="3" className="fill-primary-500" />
      <circle cx="12"  cy="10" r="3" className="fill-primary-500" />
      <circle cx="82"  cy="10" r="3" className="fill-primary-500" />
      <circle cx="112" cy="40" r="3" className="fill-primary-500" />
      <circle cx="112" cy="72" r="3" className="fill-primary-500" />
      <text x="0"   y="86"  fontSize="10" className="fill-primary-700">A</text>
      <text x="0"   y="7"   fontSize="10" className="fill-primary-700">B</text>
      <text x="84"  y="7"   fontSize="10" className="fill-primary-700">C</text>
      <text x="115" y="44"  fontSize="10" className="fill-primary-700">D</text>
      <text x="115" y="86"  fontSize="10" className="fill-primary-700">E</text>
    </svg>
  ),
};

const CORNER_LETTERS = 'ABCDEFGH';

export function CornerLabelStep() {
  const { currentRoom, setSubstep, shapeOrientation } = useRoomMeasureStore();

  if (!currentRoom) return null;

  const cornerCount = CORNER_COUNT[currentRoom.shape];
  const corners = CORNER_LETTERS.slice(0, cornerCount).split('');
  const rotateDeg = ROTATION_DEG[shapeOrientation];

  return (
    <div className="p-6 max-w-xl pb-20 sm:pb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">3.1 Разметка углов</h3>
      <p className="text-sm text-gray-500 mb-6">
        Стоя в комнате, выберите левый нижний угол — это угол&nbsp;<strong>A</strong>.
        Далее обходите углы по часовой стрелке: B, C, D…
      </p>

      {/* Shape diagram */}
      <div className="bg-primary-50 rounded-xl p-4 mb-6 h-48 flex items-center justify-center">
        <div style={{ transform: `rotate(${rotateDeg}deg)`, transition: 'transform 0.2s', width: '100%', height: '100%' }}>
          {SHAPE_SVG[currentRoom.shape]}
        </div>
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
          <strong>Подсказка:</strong> встаньте у входа лицом в комнату — угол&nbsp;<strong>A</strong> ближайший слева.
          Не нужно идти к дальнему углу: просто повернитесь налево и нумеруйте по часовой стрелке.
        </p>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-3 flex justify-end mt-4">
        <Button onClick={() => setSubstep(2)}>Далее → Высота потолка</Button>
      </div>
    </div>
  );
}
