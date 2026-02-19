import { usePomodoroSessionStore } from '@/features/pomodoro/store';
import {
  CelebrationEvent,
  useCelebrationStore,
} from '@/features/achievements/store';
import { useQuotaStore } from '@/features/quiz/store';

/**
 * useFeatureBridge
 *
 * Bu hook, farklı feature'lar arasındaki iletişimi sağlayan bir köprü görevi görür.
 * Feature'ların birbirlerinin store'larına doğrudan bağımlı olmasını engeller.
 */
export function useFeatureBridge() {
  // Pomodoro Actions
  const setPomodoroSessionId = (id: string | null) => {
    usePomodoroSessionStore.getState().setSessionId(id);
  };

  // Achievement / Celebration Actions
  const triggerCelebration = (event: CelebrationEvent) => {
    useCelebrationStore.getState().enqueueCelebration(event);
  };

  // Quiz Quota Actions
  const decrementQuizQuota = () => {
    useQuotaStore.getState().decrementQuota();
  };

  return {
    setPomodoroSessionId,
    triggerCelebration,
    decrementQuizQuota,
  };
}
