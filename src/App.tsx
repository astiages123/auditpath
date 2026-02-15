import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import RootLayout from '@/components/layout/RootLayout';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/ErrorBoundary';

import { ROUTES } from '@/utils/routes';
import { Outlet } from 'react-router-dom';

// Moving lazy imports together
const Home = lazy(() => import('@/pages/Home'));
const Achievements = lazy(() => import('@/pages/Achievements'));
const Statistics = lazy(() => import('@/pages/Statistics'));
const EfficiencyPage = lazy(() => import('@/pages/Efficiency'));
const NotesPage = lazy(() => import('@/pages/Notes'));
const AnalyticsPage = lazy(() => import('@/pages/Analytics'));

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
    <AuthProvider>
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
    </AuthProvider>
  );
}

export default App;
