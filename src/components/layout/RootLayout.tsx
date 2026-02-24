import { lazy, Suspense, type ReactNode } from 'react';
import { Header } from '@/components/layout/header/Header';
import { PomodoroModal, TimerController } from '@/features/pomodoro/components';
import { ProgramModal } from '@/features/courses/components';
import { Toaster } from '@/components/ui/sonner';
import { useCelebration } from '@/shared/hooks/useCelebration';
import { useCelebrationStore } from '@/features/achievements/store/useCelebrationStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/shared/store/useUIStore';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';
import { MobileSidebar } from './MobileSidebar';
import { cn } from '@/utils/stringHelpers';

const CelebrationModal = lazy(() =>
  import('@/shared/components/CelebrationModal').then((module) => ({
    default: module.CelebrationModal,
  }))
);

export default function RootLayout({ children }: { children: ReactNode }) {
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
  const { isMobileMenuOpen, setMobileMenuOpen, isProgramOpen, setProgramOpen } =
    useUIStore();
  usePomodoro();

  return (
    <div className="relative min-h-screen bg-[#0a0a0b] overflow-hidden">
      {/* Background Sidebar Layer */}
      <MobileSidebar />

      {/* Main Content Layer (The one that pushes left) */}
      <div
        style={{
          transform: isMobileMenuOpen
            ? 'translateX(-70vw) scale(0.85) translateZ(0)'
            : 'translateX(0) scale(1) translateZ(0)',
          borderRadius: isMobileMenuOpen ? '40px' : '0px',
          transformOrigin: 'right center',
        }}
        className={cn(
          'relative min-h-screen bg-background z-10 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-2xl flex flex-col',
          isMobileMenuOpen && 'pointer-events-none select-none overflow-hidden'
        )}
      >
        <Header />
        <main className="flex-1 overflow-x-hidden">{children}</main>

        {/* Tap to close overlay */}
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
