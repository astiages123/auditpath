import { useCallback } from 'react';
import {
  usePomodoroSessionStore,
  usePomodoroUIStore,
  useTimerStore,
} from '@/features/pomodoro/store';
import { deletePomodoroSession } from '@/features/pomodoro/services/pomodoroService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { unlockAudio } from '../logic/audioUtils';
import { usePomodoroWorker } from './usePomodoroWorker';
import { usePomodoroSession } from './usePomodoroSession';

export type PomodoroMode = 'work' | 'break';

export function usePomodoro() {
  // Timer state
  const {
    timeLeft,
    isActive,
    isBreak,
    startTime,
    duration,
    pauseStartTime,
    startTimer,
    pauseTimer,
    resetTimer,
    setMode,
    tick: storeTick,
  } = useTimerStore();

  // Session state from store
  const {
    sessionId,
    sessionCount,
    incrementSession,
    timeline,
    setHasRestored,
    originalStartTime,
    getPauseDuration,
    resetSession,
  } = usePomodoroSessionStore();

  // UI state
  const { selectedCourse, setCourse, isWidgetOpen, setWidgetOpen } =
    usePomodoroUIStore();

  const { user } = useAuth();
  const userId = user?.id;

  // --- Specialized Sub-Hooks ---
  const worker = usePomodoroWorker(storeTick);
  const { initializeSession } = usePomodoroSession(userId);

  // --- Logic ---
  const handleStart = async () => {
    if (!selectedCourse) return;

    // 1. Session Persistence
    await initializeSession();

    // 2. Notification Permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // 3. Audio Warmup
    unlockAudio();

    // 4. Timer Controls
    worker.start();
    startTimer();
  };

  // --- 3. DİĞER YARDIMCI FONKSİYONLAR ---
  const getDisplayTime = useCallback(() => {
    const isOvertime = timeLeft < 0;
    const totalSeconds = isOvertime ? duration + Math.abs(timeLeft) : timeLeft;

    const format = (sec: number) => {
      const m = Math.floor(sec / 60)
        .toString()
        .padStart(2, '0');
      const s = (sec % 60).toString().padStart(2, '0');
      return { m, s };
    };

    const main = format(Math.max(0, totalSeconds));
    const over = isOvertime ? format(Math.abs(timeLeft)) : null;

    return {
      minutes: main.m,
      seconds: main.s,
      overtimeMinutes: over?.m,
      overtimeSeconds: over?.s,
    };
  }, [timeLeft, duration]);

  const {
    minutes: m,
    seconds: s,
    overtimeMinutes: om,
    overtimeSeconds: os,
  } = getDisplayTime();

  const switchMode = useCallback(() => {
    const newMode = isBreak ? 'work' : 'break';
    setMode(newMode);

    if (newMode === 'work' && isBreak) {
      incrementSession();
    }

    // Reset worker for new cycle
    worker.start();
    startTimer();
  }, [isBreak, setMode, incrementSession, startTimer, worker]);

  const resetAndClose = async () => {
    if (userId && sessionId) {
      await deletePomodoroSession(sessionId);
    }
    worker.reset();
    resetTimer();
    resetSession();
    setHasRestored(true);
  };

  return {
    mode: isBreak ? 'break' : 'work',
    status: isActive ? 'running' : 'paused',
    minutes: m,
    seconds: s,
    isActive,
    startTime,
    totalPaused: getPauseDuration(),
    selectedCourse,
    sessionCount,
    start: handleStart,
    pause: () => {
      worker.pause();
      pauseTimer();
    },
    reset: () => {
      worker.reset();
      resetTimer();
    },
    resetAndClose,
    switchMode,
    setCourse,
    overtimeMinutes: om,
    overtimeSeconds: os,
    isOvertime: timeLeft < 0,
    totalElapsed: duration - timeLeft,
    activeDuration: (duration - timeLeft) * 1000,
    timeline,
    sessionId,
    finishDay: async () => {
      worker.reset();
      resetTimer();
      resetSession();
    },
    duration,
    timeLeft,
    isOpen: isWidgetOpen,
    setOpen: setWidgetOpen,
    originalStartTime,
    pauseStartTime,
    workerRef: worker.workerRef,
  };
}
