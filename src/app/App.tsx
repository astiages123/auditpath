import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import RootLayout from '@/shared/components/layout/RootLayout';
import { AuthGuard } from '@/features/auth';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/app/ErrorBoundary';

import { ROUTES } from '@/config/routes';
import { Outlet } from 'react-router-dom';

// Moving lazy imports together
const Home = lazy(() => import('@/app/routes/Home'));
const Achievements = lazy(() => import('@/app/routes/Achievements'));
const Statistics = lazy(() => import('@/app/routes/Statistics'));
const EfficiencyPage = lazy(() => import('@/app/routes/Efficiency'));
const NotesPage = lazy(() => import('@/app/routes/Notes'));
const AnalyticsPage = lazy(() => import('@/app/routes/Analytics'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
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
              <Route path={ROUTES.STATISTICS} element={<Statistics />} />
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
              <Route
                path={ROUTES.SETTINGS}
                element={<div>Settings Page coming soon...</div>}
              />
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
