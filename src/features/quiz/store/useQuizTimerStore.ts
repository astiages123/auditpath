import { create } from 'zustand';

interface QuizTimerState {
  startTime: number | null;
  accumulatedTime: number;
  isRunning: boolean;
  isListenerAttached: boolean;

  // Actions
  start: () => void;
  stop: () => number;
  reset: () => void;
  clear: () => void;
  getTime: () => number;
  handleVisibilityChange: () => void;
  attachListener: () => void;
  detachListener: () => void;
}

export const useQuizTimerStore = create<QuizTimerState>((set, get) => ({
  startTime: null,
  accumulatedTime: 0,
  isRunning: false,
  isListenerAttached: false,

  handleVisibilityChange: () => {
    const { startTime, isRunning } = get();
    if (
      document.visibilityState === 'hidden' &&
      isRunning &&
      startTime !== null
    ) {
      set((state) => ({
        accumulatedTime: state.accumulatedTime + (Date.now() - startTime),
        startTime: null,
        isRunning: false,
      }));
    } else if (
      document.visibilityState === 'visible' &&
      !isRunning &&
      startTime === null
    ) {
      set({ startTime: Date.now(), isRunning: true });
    }
  },

  attachListener: () => {
    const { isListenerAttached, handleVisibilityChange } = get();
    if (typeof document !== 'undefined' && !isListenerAttached) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      set({ isListenerAttached: true });
    }
  },

  detachListener: () => {
    const { isListenerAttached, handleVisibilityChange } = get();
    if (typeof document !== 'undefined' && isListenerAttached) {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      set({ isListenerAttached: false });
    }
  },

  start: () => {
    get().attachListener();
    const { startTime, isRunning } = get();
    if (!isRunning && startTime === null) {
      set({ startTime: Date.now(), isRunning: true });
    }
  },

  stop: () => {
    const { startTime, accumulatedTime, isRunning } = get();
    if (isRunning && startTime !== null) {
      const newAccumulated = accumulatedTime + (Date.now() - startTime);
      set({
        accumulatedTime: newAccumulated,
        startTime: null,
        isRunning: false,
      });
      return newAccumulated;
    }
    return accumulatedTime;
  },

  reset: () => {
    get().attachListener();
    set({
      startTime: Date.now(),
      accumulatedTime: 0,
      isRunning: true,
    });
  },

  clear: () => {
    get().detachListener();
    set({
      startTime: null,
      accumulatedTime: 0,
      isRunning: false,
    });
  },

  getTime: () => {
    const { startTime, accumulatedTime, isRunning } = get();
    if (isRunning && startTime !== null) {
      return accumulatedTime + (Date.now() - startTime);
    }
    return accumulatedTime;
  },
}));
