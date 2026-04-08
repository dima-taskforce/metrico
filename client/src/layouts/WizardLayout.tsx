import { Outlet, useParams, NavLink } from 'react-router-dom';

const STEPS = [
  { step: 1, label: 'Общая информация', path: 'info' },
  { step: 2, label: 'Комнаты', path: 'rooms' },
  { step: 3, label: 'Стены', path: 'walls' },
  { step: 4, label: 'Элементы', path: 'elements' },
  { step: 5, label: 'Фото', path: 'photos' },
];

export function WizardLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const base = `/wizard/${projectId}`;

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <nav className="flex-1 py-4">
          {STEPS.map(({ step, label, path }) => (
            <NavLink
              key={step}
              to={`${base}/${path}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span
                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium`}
                style={{ background: 'currentColor' }}
              >
                <span className="text-white">{step}</span>
              </span>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
