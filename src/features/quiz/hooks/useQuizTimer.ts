import { useCallback, useRef } from 'react';
import { createTimer } from '../logic/quizCoreLogic';

export function useQuizTimer() {
  const timerRef = useRef(createTimer());

  const startTimer = useCallback(() => {
    timerRef.current.start();
  }, []);

  const stopTimer = useCallback(() => {
    return timerRef.current.stop();
  }, []);

  const resetTimer = useCallback(() => {
    timerRef.current.reset();
  }, []);

  return {
    startTimer,
    stopTimer,
    resetTimer,
  };
}
