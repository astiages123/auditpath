import { useCallback, useEffect, useMemo } from 'react';
import { useQuizTimerStore } from '@/features/quiz/store';

/**
 * Quiz süresini yöneten ve merkezi store ile senkronize çalışan hook.
 * Soruların ne kadar sürede çözüldüğünü takip etmek için kullanılır.
 *
 * @returns {Object} { startTimer, stopTimer, resetTimer }
 */
export function useQuizTimer() {
  useEffect(() => {
    return () => {
      useQuizTimerStore.getState().clear();
    };
  }, []);

  const startTimer = useCallback(() => {
    useQuizTimerStore.getState().start();
  }, []);

  const stopTimer = useCallback(() => {
    return useQuizTimerStore.getState().stop();
  }, []);

  const resetTimer = useCallback(() => {
    useQuizTimerStore.getState().reset();
  }, []);

  return useMemo(
    () => ({
      startTimer,
      stopTimer,
      resetTimer,
    }),
    [startTimer, stopTimer, resetTimer]
  );
}
