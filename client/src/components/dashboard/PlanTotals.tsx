import type { FloorPlanRoom } from '../../types/api';

interface PlanTotalsProps {
  rooms: FloorPlanRoom[];
  projectLabel: string;
}

export function PlanTotals({ rooms, projectLabel }: PlanTotalsProps) {
  const totalArea = rooms.reduce((sum, r) => sum + (r.area ?? 0), 0);
  const totalPerimeter = rooms.reduce((sum, r) => sum + r.perimeter, 0);
  const totalVolume = rooms.reduce((sum, r) => sum + (r.volume ?? 0), 0);
  const totalWalls = rooms.reduce((sum, r) => sum + r.walls.length, 0);

  return (
    <section aria-label="Итоги по проекту" className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{projectLabel} — сводные данные</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{totalArea.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-0.5">м² общая площадь</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-700">{rooms.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">помещений</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-700">{(totalPerimeter / 1000).toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-0.5">м общий периметр</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-700">{totalVolume.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-0.5">м³ общий объём</p>
        </div>
      </div>

      {rooms.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs border-collapse" aria-label="Таблица помещений">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-2 py-1.5 border border-gray-200">Помещение</th>
                <th className="text-right px-2 py-1.5 border border-gray-200">Площадь, м²</th>
                <th className="text-right px-2 py-1.5 border border-gray-200">Периметр, м</th>
                <th className="text-right px-2 py-1.5 border border-gray-200">Объём, м³</th>
                <th className="text-right px-2 py-1.5 border border-gray-200">Стен</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 border border-gray-200 font-medium">{room.label}</td>
                  <td className="px-2 py-1.5 border border-gray-200 text-right">
                    {room.area != null ? room.area.toFixed(2) : '—'}
                  </td>
                  <td className="px-2 py-1.5 border border-gray-200 text-right">
                    {(room.perimeter / 1000).toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 border border-gray-200 text-right">
                    {room.volume != null ? room.volume.toFixed(2) : '—'}
                  </td>
                  <td className="px-2 py-1.5 border border-gray-200 text-right">
                    {room.walls.length}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td className="px-2 py-1.5 border border-gray-200">Итого</td>
                <td className="px-2 py-1.5 border border-gray-200 text-right">
                  {totalArea.toFixed(2)}
                </td>
                <td className="px-2 py-1.5 border border-gray-200 text-right">
                  {(totalPerimeter / 1000).toFixed(2)}
                </td>
                <td className="px-2 py-1.5 border border-gray-200 text-right">
                  {totalVolume.toFixed(2)}
                </td>
                <td className="px-2 py-1.5 border border-gray-200 text-right">{totalWalls}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
