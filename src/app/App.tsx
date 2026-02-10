import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import RootLayout from '@/shared/components/layout/RootLayout';
import Home from '@/app/routes/Home';
import { AuthGuard } from '@/features/auth';
import { Loader2 } from 'lucide-react';

import { ROUTES } from '@/config/routes';

// Moving lazy imports together
const Achievements = lazy(() => import('@/app/routes/Achievements'));
const Statistics = lazy(() => import('@/app/routes/Statistics'));
const EfficiencyPage = lazy(
  () => import('@/features/efficiency/EfficiencyPage')
);
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
    <RootLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path={ROUTES.HOME}
            element={
              <AuthGuard>
                <Home />
              </AuthGuard>
            }
          />
          <Route
            path={ROUTES.ACHIEVEMENTS}
            element={
              <AuthGuard>
                <Achievements />
              </AuthGuard>
            }
          />
          <Route
            path={ROUTES.STATISTICS}
            element={
              <AuthGuard>
                <Statistics />
              </AuthGuard>
            }
          />
          <Route
            path={ROUTES.EFFICIENCY}
            element={
              <AuthGuard>
                <EfficiencyPage />
              </AuthGuard>
            }
          />

          <Route
            path={`${ROUTES.NOTES}/:courseSlug`}
            element={
              <AuthGuard>
                <NotesPage />
              </AuthGuard>
            }
          />
          <Route
            path={`${ROUTES.NOTES}/:courseSlug/:topicSlug`}
            element={
              <AuthGuard>
                <NotesPage />
              </AuthGuard>
            }
          />
          <Route
            path={ROUTES.ANALYTICS}
            element={
              <AuthGuard>
                <AnalyticsPage />
              </AuthGuard>
            }
          />
          <Route
            path={ROUTES.SETTINGS}
            element={
              <AuthGuard>
                <div>Settings Page coming soon...</div>
              </AuthGuard>
            }
          />

          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
      </Suspense>
    </RootLayout>
  );
}

export default App;
