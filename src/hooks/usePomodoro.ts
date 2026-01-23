import { useCallback, useState, useEffect } from "react";
import { useTimerStore } from "@/store/useTimerStore";
import {
  getDailySessionCount,
  deletePomodoroSession,
  getStreak,
} from "@/lib/client-db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type PomodoroMode = "work" | "break";

export function usePomodoro() {
  const {
    timeLeft,
    isActive,
    isBreak,
    startTime,
    totalPaused,
    selectedCourse,
    startTimer,
    pauseTimer,
    resetTimer,
    setMode,
    setCourse,
    duration,
    isWidgetOpen,
    setWidgetOpen,
    sessionCount,
    incrementSession,
    sessionId,
    setSessionId,
    timeline,
    setSessionCount,
    setHasRestored,
    originalStartTime,
    pauseStartTime,
  } = useTimerStore();

  const { user } = useAuth();
  const userId = user?.id;
  const [streak, setStreak] = useState(0);

  // Still fetch streak here as it's purely for UI display in this hook's consumers
  useEffect(() => {
    if (userId) {
      getStreak(userId).then((s) => setStreak(s));
    }
  }, [userId]);

  // Start/Resume Wrapper
  const handleStart = async () => {
    if (!selectedCourse) return;

    if (!sessionId) {
      if (userId) {
        getDailySessionCount(userId).then(count => setSessionCount(count + 1));
      }
      const newId = crypto.randomUUID();
      setSessionId(newId);
    }
    
    // Request notification permission on user action
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    startTimer();
  };

  const getDisplayTime = () => {
    const isOvertime = timeLeft < 0;
    const totalSeconds = isOvertime ? (duration + Math.abs(timeLeft)) : timeLeft;
    
    const format = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, "0");
        const s = (sec % 60).toString().padStart(2, "0");
        return { m, s };
    };

    const main = format(Math.max(0, totalSeconds));
    const over = isOvertime ? format(Math.abs(timeLeft)) : null;

    return { 
        minutes: main.m, 
        seconds: main.s, 
        overtimeMinutes: over?.m, 
        overtimeSeconds: over?.s 
    };
  };

  const { minutes: m, seconds: s, overtimeMinutes: om, overtimeSeconds: os } = getDisplayTime();

  const switchMode = useCallback(() => {
    const newMode = isBreak ? "work" : "break";
    setMode(newMode);
    
    if (newMode === "work" && isBreak) {
        if (userId) {
          getDailySessionCount(userId).then(count => setSessionCount(count + 1));
        } else {
          incrementSession();
        }
    }
    
    startTimer();
  }, [isBreak, setMode, incrementSession, startTimer, userId, setSessionCount, setSessionId]);

  const resetAndClose = async () => {
    if (userId && sessionId) {
       await deletePomodoroSession(sessionId);
    }
    
    const { resetAll } = useTimerStore.getState();
    resetAll();
    setHasRestored(true);
  };

  return {
    mode: isBreak ? "break" : "work",
    status: isActive ? "running" : "paused",
    minutes: m,
    seconds: s,
    isActive,
    startTime,
    totalPaused,
    selectedCourse,
    sessionCount,
    start: handleStart,
    pause: pauseTimer,
    reset: () => resetTimer(),
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
      // The actual saving/sealing is handled by the finishDay action 
      // but since we want to clear the store:
      const { resetAll } = useTimerStore.getState();
      resetAll();
    },
    duration,
    timeLeft,
    isOpen: isWidgetOpen,
    setOpen: setWidgetOpen,
    streak,
    originalStartTime,
    pauseStartTime,
  };
}
