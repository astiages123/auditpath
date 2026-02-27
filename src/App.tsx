import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import DashboardLayout from '@/components/layout/dashboard/DashboardLayout';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ROUTES } from '@/utils/routes';
import { Outlet } from 'react-router-dom';

// Moving lazy imports together
const Home = lazy(() => import('@/pages/Home'));
const Achievements = lazy(() => import('@/pages/Achievements'));

const StatisticsPage = lazy(() => import('@/pages/Statistics'));
const NotesPage = lazy(() => import('@/pages/Notes'));
const CourseLibrary = lazy(() => import('@/pages/CourseLibrary'));
const CostsPage = lazy(() => import('@/pages/Costs'));
const QuizPage = lazy(() => import('@/pages/Quiz'));
const RoadmapPage = lazy(() => import('@/pages/Roadmap'));

// Loading fallback logic moved to DashboardLayout

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public Routes would go here if any */}

        {/* Protected Routes */}
        <Route element={<AuthGuard />}>
          <Route
            element={
              <DashboardLayout>
                <Outlet />
              </DashboardLayout>
            }
          >
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.ACHIEVEMENTS} element={<Achievements />} />
            <Route path={ROUTES.STATISTICS} element={<StatisticsPage />} />

            {/* Çalışma Merkezi */}
            <Route path={ROUTES.LIBRARY} element={<CourseLibrary />} />
            <Route
              path={ROUTES.NOTES}
              element={<Navigate to={ROUTES.LIBRARY} replace />}
            />
            <Route
              path={ROUTES.QUIZ}
              element={<Navigate to={ROUTES.LIBRARY} replace />}
            />

            {/* Ders içi sayfalar (korundu) */}
            <Route
              path={`${ROUTES.NOTES}/:courseSlug`}
              element={<NotesPage />}
            />
            <Route
              path={`${ROUTES.NOTES}/:courseSlug/:topicSlug`}
              element={<NotesPage />}
            />
            <Route path={`${ROUTES.QUIZ}/:courseSlug`} element={<QuizPage />} />
            <Route
              path={`${ROUTES.QUIZ}/:courseSlug/:topicSlug`}
              element={<QuizPage />}
            />

            <Route path={ROUTES.COSTS} element={<CostsPage />} />
            <Route path={ROUTES.ROADMAP} element={<RoadmapPage />} />
          </Route>
        </Route>

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
