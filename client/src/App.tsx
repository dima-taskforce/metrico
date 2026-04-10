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
import { SketchStep } from './pages/wizard/SketchStep';
import { RoomsStep } from './pages/wizard/RoomsStep';
import { SummaryStep } from './pages/wizard/SummaryStep';
import { MeasureStep } from './pages/wizard/MeasureStep';
import { PlanStep } from './pages/wizard/PlanStep';
import { RoomViewPage } from './pages/wizard/RoomViewPage';

// Lazy imports for main pages (to be implemented in S1-08, S1-09, S1-11)
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { PlanDashboardPage } from './pages/PlanDashboardPage';
import { CornerLabelsDebug } from './pages/debug/CornerLabelsDebug';

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
        <Route path="/debug/corners" element={<CornerLabelsDebug />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id/plan" element={<PlanDashboardPage />} />
          </Route>

          {/* Wizard */}
          <Route path="/wizard/:projectId" element={<WizardLayout />}>
            <Route index element={<Navigate to="info" replace />} />
            <Route path="info" element={<ProjectInfoStep />} />
            <Route path="sketch" element={<SketchStep />} />
            <Route path="rooms" element={<RoomsStep />} />
            <Route path="plan" element={<PlanStep />} />
            <Route path="summary" element={<SummaryStep />} />
            <Route path="walls" element={<PlaceholderStep title="Стены" />} />
            <Route path="elements" element={<PlaceholderStep title="Элементы" />} />
            <Route path="photos" element={<PlaceholderStep title="Фото" />} />
          </Route>

          {/* Room measure flow — full-screen, outside WizardLayout sidebar */}
          <Route
            path="/wizard/:projectId/rooms/:roomId/measure"
            element={<MeasureStep />}
          />
          <Route
            path="/wizard/:projectId/rooms/:roomId/view"
            element={<RoomViewPage />}
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
