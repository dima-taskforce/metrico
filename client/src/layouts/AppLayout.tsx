import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

export function AppLayout() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authApi.logout().catch(() => undefined);
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link to="/projects" className="flex items-center gap-2">
          <img src="/logo.png" alt="Metrico" className="h-10 w-10 object-contain" />
          <span className="text-xl font-semibold text-primary-600">Metrico</span>
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-gray-600">{user.email}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Выйти
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
