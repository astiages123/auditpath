import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import RootLayout from '@/components/layout/RootLayout';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { GlobalPageSkeleton } from '@/shared/components/SkeletonTemplates';

import { ROUTES } from '@/utils/routes';
import { Outlet } from 'react-router-dom';

// Moving lazy imports together
const Home = lazy(() => import('@/pages/Home'));
const Achievements = lazy(() => import('@/pages/Achievements'));

const EfficiencyPage = lazy(() => import('@/pages/Efficiency'));
const NotesPage = lazy(() => import('@/pages/Notes'));
const AnalyticsPage = lazy(() => import('@/pages/Analytics'));
const QuizPage = lazy(() => import('@/pages/Quiz'));
const RoadmapPage = lazy(() => import('@/pages/Roadmap'));

// Loading fallback component
function PageLoader() {
  return <GlobalPageSkeleton />;
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes would go here if any */}

          {/* Protected Routes */}
          <Route element={<AuthGuard />}>
            <Route
              element={
                <RootLayout>
                  <Outlet />
                </RootLayout>
              }
            >
              <Route path={ROUTES.HOME} element={<Home />} />
              <Route path={ROUTES.ACHIEVEMENTS} element={<Achievements />} />
              <Route path={ROUTES.EFFICIENCY} element={<EfficiencyPage />} />

              <Route
                path={`${ROUTES.NOTES}/:courseSlug`}
                element={<NotesPage />}
              />
              <Route
                path={`${ROUTES.NOTES}/:courseSlug/:topicSlug`}
                element={<NotesPage />}
              />
              <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage />} />
              <Route path={ROUTES.QUIZ} element={<QuizPage />} />
              <Route
                path={`${ROUTES.QUIZ}/:courseSlug`}
                element={<QuizPage />}
              />
              <Route
                path={`${ROUTES.QUIZ}/:courseSlug/:topicSlug`}
                element={<QuizPage />}
              />
              <Route path={ROUTES.ROADMAP} element={<RoadmapPage />} />
            </Route>
          </Route>

          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
