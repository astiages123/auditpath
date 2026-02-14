import { lazy, Suspense, useCallback, type ReactNode } from 'react';
import { Header } from '@/shared/components/layout/Header';
import { PomodoroModal } from '@/features/pomodoro';
import { TimerController } from '@/features/pomodoro';
import { Toaster } from '@/shared/components/ui/sonner';
import { useCelebration } from '@/shared/hooks/use-celebration';
import { useCelebrationStore } from '@/shared/store/use-celebration-store';
import { useAuth } from '@/features/auth';

const CelebrationModal = lazy(() =>
  import('@/shared/components/modals/CelebrationModal').then((module) => ({
    default: module.CelebrationModal,
  }))
);

export default function RootLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  useCelebration();
  const { current, isOpen, close } = useCelebrationStore();

  const handleComplete = useCallback(async () => {
    if (current && current.onClose) {
      await current.onClose();
    }
    close();
  }, [close, current]);

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
