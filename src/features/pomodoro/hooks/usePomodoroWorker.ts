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
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    // Initialize Worker only once
    const worker = new Worker(
      new URL('../logic/timerWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data === 'TICK') {
        onTickRef.current();
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const postMessage = useCallback(
    (message: 'START' | 'PAUSE' | 'RESET' | 'STOP') => {
      workerRef.current?.postMessage(message);
    },
    []
  );

  return {
    start: () => postMessage('START'),
    pause: () => postMessage('PAUSE'),
    reset: () => postMessage('RESET'),
    stop: () => postMessage('STOP'),
    workerRef,
  };
}
