import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  POMODORO_BREAK_DURATION_SECONDS,
  POMODORO_WORK_DURATION_SECONDS,
} from '../utils/constants';

// ===========================
// === STORE INTERFACE ===
// ===========================

export interface TimerState {
  // === STATE ===
  timeLeft: number;
  isActive: boolean;
  isBreak: boolean;
  duration: number;
  startTime: number | null;
  endTime: number | null;
  pauseStartTime: number | null;

  // === ACTIONS ===
  /** Begins the countdown timer */
  startTimer: () => void;
  /** Pauses the current timer */
  pauseTimer: () => void;
  /** Resets the timer to its initial duration or a custom time */
  resetTimer: (initialTime?: number) => void;
  /** Updates the remaining time */
  tick: () => void;
  /** Sets the Pomodoro mode ('work' or 'break') */
  setMode: (mode: 'work' | 'break') => void;
  /** Restores previous timer state from local storage or memory */
  restoreState: (
    timeLeft: number,
    isActive: boolean,
    isBreak: boolean,
    duration: number,
    startTime: number | null,
    endTime: number | null,
    pauseStartTime: number | null
  ) => void;
}

// ===========================
// === STORE IMPLEMENTATION ===
// ===========================

export const useTimerStore = create<TimerState>()(
  persist(
    (set, _get) => ({
      timeLeft: POMODORO_WORK_DURATION_SECONDS,
      isActive: false,
      isBreak: false,
      duration: POMODORO_WORK_DURATION_SECONDS,
      startTime: null,
      endTime: null,
      pauseStartTime: null,

      startTimer: () =>
        set((state) => {
          const now = Date.now();
          const endTime = now + state.timeLeft * 1000;

          return {
            isActive: true,
            startTime: now,
            endTime,
            pauseStartTime: null,
          };
        }),

      pauseTimer: () =>
        set((state) => {
          if (!state.isActive) return state;

          const now = Date.now();
          let newTimeLeft = state.timeLeft;
          if (state.endTime) {
            newTimeLeft = Math.ceil((state.endTime - now) / 1000);
          }

          return {
            isActive: false,
            endTime: null,
            timeLeft: newTimeLeft,
            pauseStartTime: now,
          };
        }),

      resetTimer: (initialTime) =>
        set((state) => ({
          isActive: false,
          timeLeft: initialTime !== undefined ? initialTime : state.duration,
          startTime: null,
          endTime: null,
          pauseStartTime: null,
        })),

      tick: () =>
        set((state) => {
          if (!state.isActive || !state.endTime) return state;
          const now = Date.now();
          const newTimeLeft = Math.ceil((state.endTime - now) / 1000);
          return { timeLeft: newTimeLeft };
        }),

      setMode: (mode) => {
        const newDuration =
          mode === 'work'
            ? POMODORO_WORK_DURATION_SECONDS
            : POMODORO_BREAK_DURATION_SECONDS;
        set({
          isBreak: mode === 'break',
          duration: newDuration,
          timeLeft: newDuration,
          isActive: false,
          startTime: null,
          endTime: null,
          pauseStartTime: null,
        });
      },

      restoreState: (
        timeLeft,
        isActive,
        isBreak,
        duration,
        startTime,
        endTime,
        pauseStartTime
      ) =>
        set({
          timeLeft,
          isActive,
          isBreak,
          duration,
          startTime,
          endTime,
          pauseStartTime,
        }),
    }),
    {
      name: 'timer-storage',
      partialize: (state) => ({
        timeLeft: state.timeLeft,
        isActive: state.isActive,
        isBreak: state.isBreak,
        duration: state.duration,
        startTime: state.startTime,
        endTime: state.endTime,
        pauseStartTime: state.pauseStartTime,
      }),
    }
  )
);
