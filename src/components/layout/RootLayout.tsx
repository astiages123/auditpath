import { lazy, Suspense, type ReactNode } from 'react';
import { Header } from '@/components/layout/header/Header';
import { PomodoroModal, TimerController } from '@/features/pomodoro/components';
import { Toaster } from '@/components/ui/sonner';
import { useCelebration } from '@/shared/hooks/useCelebration';
import { useCelebrationStore } from '@/features/achievements/store/useCelebrationStore';
import { useAuth } from '@/features/auth/hooks/useAuth';

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
