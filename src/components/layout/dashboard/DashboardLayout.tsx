import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { PomodoroModal, TimerController } from '@/features/pomodoro/components';
import { ProgramModal } from '@/features/courses/components';
import { Toaster } from '@/components/ui/sonner';
import { useCelebration } from '@/shared/hooks/useCelebration';
import { useCelebrationStore } from '@/features/achievements/store/useCelebrationStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/shared/store/useUIStore';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';
import { MobileSidebar } from '../MobileSidebar';
import { Sidebar } from './Sidebar';
import { DashHeader } from './Header';
import { cn } from '@/utils/stringHelpers';
import { ROUTES } from '@/utils/routes';

const CelebrationModal = lazy(() =>
  import('@/shared/components/CelebrationModal').then((module) => ({
    default: module.CelebrationModal,
  }))
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  useCelebration();

  const current = useCelebrationStore((state) => state.currentCelebration);
  const isOpen = useCelebrationStore((state) => state.isCelebrationOpen);
  const closeCelebration = useCelebrationStore(
    (state) => state.closeCelebration
  );

  const handleComplete = async () => {
    if (current && current.onClose) {
      await current.onClose();
    }
    closeCelebration();
  };

  const {
    isMobileMenuOpen,
    setMobileMenuOpen,
    isProgramOpen,
    setProgramOpen,
    isSidebarCollapsed,
    setSidebarCollapsed,
  } = useUIStore();
  usePomodoro();

  const location = useLocation();

  const isFullWidthPage =
    location.pathname.startsWith(ROUTES.NOTES) ||
    location.pathname.startsWith(ROUTES.QUIZ);

  const rootRoute = location.pathname.split('/')[1];

  useEffect(() => {
    const isSpecialPage = rootRoute === 'notes' || rootRoute === 'quiz';

    if (isSpecialPage) {
      setSidebarCollapsed(true);
    }
  }, [rootRoute, setSidebarCollapsed]);

  const effectiveCollapsed = isSidebarCollapsed;
  const sidebarWidth = effectiveCollapsed ? '64px' : '260px';

  return (
    <div className="relative min-h-screen bg-[#0a0a0b] overflow-hidden">
      {/* Background Sidebar Layer (Mobil) */}
      <MobileSidebar />

      {/* Main Content Layer (The one that pushes left on mobile) */}
      <div
        style={{
          transform: isMobileMenuOpen
            ? 'translateX(-75vw) translateZ(0)'
            : 'translateX(0) translateZ(0)',
          transformOrigin: 'right center',
        }}
        className={cn(
          'relative min-h-screen bg-background z-10 transition-all duration-500 ease-[cubic-bezier(0.4,0,0,0.2,1)] shadow-2xl',
          isMobileMenuOpen && 'pointer-events-none select-none overflow-hidden'
        )}
      >
        {/* L-Shape Grid Layout */}
        <div
          className={cn(
            'h-screen grid grid-cols-1 grid-rows-[64px_1fr] lg:grid-rows-[80px_1fr] transition-all duration-300 ease-in-out',
            'lg:grid-cols-[var(--sidebar-width)_1fr]'
          )}
          style={
            {
              ['--sidebar-width' as string]: sidebarWidth,
            } as React.CSSProperties
          }
        >
          {/* Sidebar: col-1, row-span-2 (Hidden on mobile via its own className) */}
          <Sidebar />

          {/* Header: col-2, row-1 (In mobile it fills row 1) */}
          <DashHeader />

          {/* Main Content: col-2, row-2 (In mobile it fills row 2) */}
          <main
            className={cn(
              'min-h-0 lg:col-start-2',
              isFullWidthPage
                ? 'h-full overflow-hidden'
                : 'overflow-y-auto overflow-x-hidden'
            )}
          >
            <div
              className={cn(
                'flex flex-col mx-auto w-full px-4 lg:px-8 py-4 md:py-6',
                isFullWidthPage
                  ? 'max-w-[1800px] h-full'
                  : 'max-w-[1400px] min-h-full'
              )}
            >
              {children}
            </div>
          </main>
        </div>

        {/* Tap to close overlay (Mobil) */}
        {isMobileMenuOpen && (
          <div
            className="absolute inset-0 z-50 cursor-pointer pointer-events-auto"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </div>

      <TimerController />
      <PomodoroModal />
      <ProgramModal open={isProgramOpen} onOpenChange={setProgramOpen} />
      <Toaster position="top-center" richColors />

      {user && current && isOpen && (
        <Suspense fallback={null}>
          <CelebrationModal
            isOpen={isOpen}
            onClose={handleComplete}
            title={current.title}
            description={current.description}
            subtitle={current.subtitle}
            icon={current.icon}
            imageUrl={current.imageUrl}
            variant={current.variant === 'group' ? 'course' : current.variant}
          />
        </Suspense>
      )}
    </div>
  );
}
