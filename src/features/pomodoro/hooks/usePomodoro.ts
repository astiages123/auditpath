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

/**
 * Main hook that bundles together all Pomodoro logic (timer, session, UI).
 * Components should consume this hook instead of individual stores or partial hooks.
 *
 * @returns Combined Pomodoro state and control functions
 */
export function usePomodoro() {
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

  const {
    sessionId,
    sessionCount,
    incrementSession,
    timeline,
    setHasRestored,
    originalStartTime,
    getPauseDuration,
    addTimelineEvent,
    closeLastTimelineEvent,
    resetSession,
  } = usePomodoroSessionStore();

  const { selectedCourse, setCourse, isWidgetOpen, setWidgetOpen, resetUI } =
    usePomodoroUIStore();

  const { user } = useAuth();
  const userId = user?.id;

  const worker = usePomodoroWorker(storeTick);
  const { initializeSession } = usePomodoroSession(userId);
  const handleStart = async () => {
    if (!selectedCourse) return;

    await initializeSession();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    unlockAudio();
    const lastEvent = timeline[timeline.length - 1];
    if (lastEvent && lastEvent.type === 'pause') {
      closeLastTimelineEvent();
      addTimelineEvent({ type: isBreak ? 'break' : 'work', start: Date.now() });
    }

    worker.start();
    startTimer();
  };

  const getDisplayTime = useCallback(() => {
    const isOvertime = timeLeft < 0;
    const totalSeconds = isOvertime ? duration + Math.abs(timeLeft) : timeLeft;

    const format = (sec: number) => {
      const minutes = Math.floor(sec / 60)
        .toString()
        .padStart(2, '0');
      const seconds = (sec % 60).toString().padStart(2, '0');
      return { minutes, seconds };
    };

    const mainTime = format(Math.max(0, totalSeconds));
    const overtime = isOvertime ? format(Math.abs(timeLeft)) : null;

    return {
      minutes: mainTime.minutes,
      seconds: mainTime.seconds,
      overtimeMinutes: overtime?.minutes,
      overtimeSeconds: overtime?.seconds,
    };
  }, [timeLeft, duration]);

  const {
    minutes: displayMinutes,
    seconds: displaySeconds,
    overtimeMinutes: displayOvertimeMinutes,
    overtimeSeconds: displayOvertimeSeconds,
  } = getDisplayTime();

  const switchMode = useCallback(() => {
    const newMode = isBreak ? 'work' : 'break';

    closeLastTimelineEvent();
    addTimelineEvent({ type: newMode, start: Date.now() });

    setMode(newMode);

    if (newMode === 'work' && isBreak) {
      incrementSession();
    }

    worker.start();
    startTimer();
  }, [
    isBreak,
    setMode,
    incrementSession,
    startTimer,
    worker,
    addTimelineEvent,
    closeLastTimelineEvent,
  ]);

  const resetAndClose = async () => {
    if (userId && sessionId) {
      await deletePomodoroSession(sessionId);
    }
    worker.reset();
    resetTimer();
    resetSession();
    resetUI();
    setHasRestored(true);
  };

  return {
    mode: isBreak ? 'break' : 'work',
    status: isActive ? 'running' : 'paused',
    minutes: displayMinutes,
    seconds: displaySeconds,
    isActive,
    startTime,
    totalPaused: getPauseDuration(),
    selectedCourse,
    sessionCount,
    start: handleStart,
    pause: () => {
      closeLastTimelineEvent();
      addTimelineEvent({ type: 'pause', start: Date.now() });
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
    overtimeMinutes: displayOvertimeMinutes,
    overtimeSeconds: displayOvertimeSeconds,
    isOvertime: timeLeft < 0,
    totalElapsed: duration - timeLeft,
    activeDuration: (duration - timeLeft) * 1000,
    timeline,
    sessionId,
    finishDay: async () => {
      worker.reset();
      resetTimer();
      resetSession();
      resetUI();
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
