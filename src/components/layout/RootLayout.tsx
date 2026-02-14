import { lazy, Suspense, useCallback, type ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { PomodoroModal } from '@/features/pomodoro/components';
import { TimerController } from '@/features/pomodoro/components';
import { Toaster } from '@/components/ui/sonner';
import { useCelebration } from '@/hooks/useCelebration';
import { useUIStore } from '@/store/ui.store';
import { useAuth } from '@/features/auth/hooks/useAuth';

const CelebrationModal = lazy(() =>
  import('@/shared/CelebrationModal').then((module) => ({
    default: module.CelebrationModal,
  }))
);

export default function RootLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  useCelebration();
  const {
    currentCelebration: current,
    isCelebrationOpen: isOpen,
    actions,
  } = useUIStore();

  const handleComplete = useCallback(async () => {
    if (current && current.onClose) {
      await current.onClose();
    }
    actions.closeCelebration();
  }, [actions, current]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <TimerController />
      <PomodoroModal />

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
