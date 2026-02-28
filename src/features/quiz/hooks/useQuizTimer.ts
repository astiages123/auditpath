import { useCallback, useEffect } from 'react';
import { useQuizTimerStore } from '@/features/quiz/store';

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

  return { startTimer, stopTimer, resetTimer };
}
