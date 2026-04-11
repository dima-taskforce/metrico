import { Outlet, useParams, NavLink, Link, useLocation } from 'react-router-dom';

const STEPS = [
  { step: 1, label: 'Общая информация', path: 'info' },
  { step: 2, label: 'Набросок плана', path: 'sketch' },
  { step: 3, label: 'Комнаты', path: 'rooms' },
  { step: 4, label: 'Сборка плана', path: 'plan' },
  { step: 5, label: 'Сводка', path: 'summary' },
];

export function WizardLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const base = `/wizard/${projectId}`;

  const activeStep =
    STEPS.find((s) => location.pathname.includes(`/${s.path}`)) ?? STEPS[0]!;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-57px)]">
      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <div className="md:hidden shrink-0 bg-white border-b border-gray-200">
        {/* Row: back link + step label + counter */}
        <div className="flex items-center justify-between px-4 py-2.5 gap-2">
          <Link
            to="/projects"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors shrink-0"
          >
            ← Проекты
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {activeStep.label}
            </span>
            <span className="text-xs text-gray-400 shrink-0 bg-gray-100 rounded-full px-2 py-0.5">
              {activeStep.step}&thinsp;/&thinsp;{STEPS.length}
            </span>
          </div>
        </div>

        {/* Step dots progress */}
        <div className="flex items-center gap-1.5 px-4 pb-2.5">
          {STEPS.map(({ step, path }) => {
            const isActive = activeStep.step === step;
            const isDone = activeStep.step > step;
            return (
              <NavLink
                key={step}
                to={`${base}/${path}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'flex-[2] bg-primary-600'
                    : isDone
                    ? 'flex-1 bg-primary-200'
                    : 'flex-1 bg-gray-200'
                }`}
                aria-label={`Шаг ${step}`}
              />
            );
          })}
        </div>
      </div>

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-200 flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <Link
            to="/projects"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            ← Проекты
          </Link>
        </div>
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
                className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium shrink-0"
                style={{ background: 'currentColor' }}
              >
                <span className="text-white">{step}</span>
              </span>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
