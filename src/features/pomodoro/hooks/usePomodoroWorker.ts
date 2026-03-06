import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { TimerWorkerMessage } from '../logic/timerWorker';

/**
 * Global singleton to manage the Timer Worker across the entire application.
 * Prevents multiple workers from being created during re-renders or StrictMode.
 */
class PomodoroWorkerManager {
  private static instance: PomodoroWorkerManager;
  private worker: Worker | null = null;
  private listeners: Set<() => void> = new Set();
  private refCount: number = 0;

  private constructor() {}

  static getInstance(): PomodoroWorkerManager {
    if (!PomodoroWorkerManager.instance) {
      PomodoroWorkerManager.instance = new PomodoroWorkerManager();
    }
    return PomodoroWorkerManager.instance;
  }

  private initWorker() {
    if (this.worker) return;

    this.worker = new Worker(
      new URL('../logic/timerWorker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (event: MessageEvent<string>) => {
      if (event.data === 'TICK') {
        this.listeners.forEach((onTick) => onTick());
      }
    };
  }

  subscribe(onTick: () => void) {
    this.refCount++;
    this.listeners.add(onTick);

    if (!this.worker) {
      this.initWorker();
    }

    return () => {
      this.listeners.delete(onTick);
      this.refCount--;

      if (this.refCount <= 0) {
        this.terminate();
      }
    };
  }

  postMessage(message: TimerWorkerMessage) {
    this.worker?.postMessage(message);
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}

const workerManager = PomodoroWorkerManager.getInstance();

/**
 * Hook to manage the specialized Pomodoro Timer Worker.
 * Ensures stable worker lifecycle and background timer accuracy.
 *
 * @param onTick Callback executed on every timer tick
 * @returns Object with control methods: start, pause, reset, stop
 */
export function usePomodoroWorker(onTick: () => void) {
  const onTickRef = useRef(onTick);

  useLayoutEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    const handleTick = () => onTickRef.current();
    const unsubscribe = workerManager.subscribe(handleTick);

    return () => {
      unsubscribe();
    };
  }, []);

  const postMessage = useCallback((message: TimerWorkerMessage) => {
    workerManager.postMessage(message);
  }, []);

  return {
    start: () => postMessage('START'),
    pause: () => postMessage('STOP'),
    reset: () => postMessage('STOP'),
    stop: () => postMessage('STOP'),
    workerRef: workerManager, // Exposing the singleton manager or the worker instance
  };
}
