import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook to manage the specialized Pomodoro Timer Worker.
 * Ensures stable worker lifecycle and background timer accuracy.
 *
 * @param onTick Callback executed on every timer tick
 * @returns Object with control methods: start, pause, reset
 */
export function usePomodoroWorker(onTick: () => void) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Worker only once
    const worker = new Worker(
      new URL('../logic/timerWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data === 'TICK') {
        onTick();
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [onTick]);

  const postMessage = useCallback((message: 'START' | 'PAUSE' | 'RESET') => {
    workerRef.current?.postMessage(message);
  }, []);

  return {
    start: () => postMessage('START'),
    pause: () => postMessage('PAUSE'),
    reset: () => postMessage('RESET'),
    workerRef,
  };
}
