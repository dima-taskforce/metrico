import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { authApi } from './api/auth';
import { AuthGuard } from './layouts/AuthGuard';
import { AppLayout } from './layouts/AppLayout';
import { WizardLayout } from './layouts/WizardLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlaceholderStep } from './pages/wizard/PlaceholderStep';
import { ProjectInfoStep } from './pages/wizard/ProjectInfoStep';

// Lazy imports for main pages (to be implemented in S1-08, S1-09, S1-11)
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProjectsPage } from './pages/ProjectsPage';

function AppBootstrap() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const handleLogout = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [setUser, setLoading]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AppBootstrap />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
          </Route>

          {/* Wizard */}
          <Route path="/wizard/:projectId" element={<WizardLayout />}>
            <Route index element={<Navigate to="info" replace />} />
            <Route path="info" element={<ProjectInfoStep />} />
            <Route path="rooms" element={<PlaceholderStep title="Комнаты" />} />
            <Route path="walls" element={<PlaceholderStep title="Стены" />} />
            <Route path="elements" element={<PlaceholderStep title="Элементы" />} />
            <Route path="photos" element={<PlaceholderStep title="Фото" />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
