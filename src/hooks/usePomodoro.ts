import { useEffect, useCallback, useState, useRef } from "react";
import { useTimerStore } from "@/store/useTimerStore";
import {
  getDailySessionCount,
  getLatestActiveSession,
  upsertPomodoroSession,
  getStreak,
  deletePomodoroSession,
} from "@/lib/client-db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type PomodoroMode = "work" | "break";

const playNotificationSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    oscillator.frequency.setValueAtTime(587, ctx.currentTime + 0.1); // D5

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

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
  } = useTimerStore();

  const { user } = useAuth();
  const userId = user?.id;
  const [streak, setStreak] = useState(0);

  // Restore active session or sync daily count
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    // 1. Always update daily count on mount
    getDailySessionCount(userId).then((count) => {
      if (sessionId) {
        setSessionCount(count);
      } else {
        setSessionCount(count + 1);
      }
    });

    // 2. Update Streak
    getStreak(userId).then((s) => setStreak(s));

    // 3. Restore active session if idle
    if (
      !sessionId &&
      !isActive &&
      startTime === null &&
      userId &&
      !restoredRef.current
    ) {
      getLatestActiveSession(userId).then((session) => {
        if (session) {
          const sessionAge = Date.now() - new Date(session.started_at).getTime();
          const isRecent = sessionAge < 12 * 60 * 60 * 1000; // 12 hours

          if (isRecent) {
            setSessionId(session.id);
            if (session.course_id && session.course_name && !selectedCourse) {
              setCourse({
                id: session.course_id,
                name: session.course_name,
                category: session.course?.category?.name || "General",
              });
            }

            // Prevent duplicate toasts
            if (!restoredRef.current) {
              toast.info("Önceki oturumunuzdan devam ediliyor.");
              restoredRef.current = true;
            }
          }
        }
      });
    }
  }, [
    userId,
    sessionId,
    isActive,
    startTime,
    setSessionId,
    setCourse,
    selectedCourse,
    setSessionCount,
  ]);

  // Sync State to DB
  useEffect(() => {
    if (!userId || !selectedCourse || !sessionId) return;

    const save = async () => {
      // Boş veya hiç ilerleme kaydedilmemiş oturumları kaydetme
      const hasStarted = timeline.length > 0;
      const hasProgress = timeline.some((e) => e.end && e.end - e.start > 1000); // En az 1 saniye

      if (!hasStarted && !hasProgress) return;

      const result = await upsertPomodoroSession(
        {
          id: sessionId,
          courseId: selectedCourse.id,
          courseName: selectedCourse.name,
          timeline,
          startedAt: startTime || Date.now(),
        },
        userId
      );

      if (result && "error" in result && result.error) {
        console.error("Auto-save failed:", result.error);
      }
    };

    save();
  }, [
    isActive,
    isBreak,
    sessionId,
    userId,
    timeline,
    selectedCourse,
    startTime,
  ]);

  // Start/Resume Wrapper
  const handleStart = async () => {
    if (!selectedCourse) return;

    // If no session ID, generate it but don't save yet.
    // Auto-save effect will handle the first save once progress starts.
    if (!sessionId) {
      const newId = crypto.randomUUID();
      setSessionId(newId);
    }
    startTimer();
  };

  // Handle session completion/notifications
  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      if (Notification.permission === "granted") {
        new Notification("Süre Doldu!", {
          body: !isBreak
            ? "Çalışma süresi bitti. Mola verme zamanı!"
            : "Mola bitti. Çalışmaya dön!",
          icon: "/logo.svg",
        });
      }
      playNotificationSound();

      // Auto-save completion
      if (userId && sessionId && selectedCourse) {
        upsertPomodoroSession(
          {
            id: sessionId,
            courseId: selectedCourse.id,
            courseName: selectedCourse.name,
            timeline,
            startedAt: startTime || Date.now(),
            isCompleted: true,
          },
          userId
        ).then((res) => {
          if (res && "error" in res && res.error) {
            toast.error(
              "Oturum kaydedilemedi! Lütfen internet bağlantınızı kontrol edin."
            );
          } else {
            setSessionId(null);
            incrementSession();
          }
        });
      }
    }
  }, [
    timeLeft,
    isActive,
    isBreak,
    userId,
    sessionId,
    selectedCourse,
    timeline,
    startTime,
    incrementSession,
    setSessionId,
  ]);

  const formatTime = (seconds: number) => {
    const absoluteSeconds = Math.abs(seconds);
    const m = Math.floor(absoluteSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (absoluteSeconds % 60).toString().padStart(2, "0");
    return {
      m: seconds < 0 ? `+${m}` : m,
      s,
    };
  };

  const { m, s } = formatTime(timeLeft);

  const switchMode = useCallback(() => {
    const newMode = isBreak ? "work" : "break";
    setMode(newMode);
    if (newMode === "work") incrementSession();
    // Auto-start timer
    startTimer();
  }, [isBreak, setMode, incrementSession, startTimer]);

  const resetAndClose = async () => {
    if (userId && sessionId) {
      await deletePomodoroSession(sessionId);
    }
    resetTimer();
    setCourse(null);
    setSessionId(null);
    restoredRef.current = true; // Prevent restoration for this mount
    setWidgetOpen(false);
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
    overtime:
      timeLeft < 0
        ? formatTime(timeLeft).m + ":" + formatTime(timeLeft).s
        : null,
    isOvertime: timeLeft < 0,
    activeDuration: (duration - timeLeft) * 1000,
    timeline,
    sessionId,
    finishDay: async () => {
      if (userId && sessionId && selectedCourse) {
        const hasProgress = timeline.some(
          (e) => e.end && e.end - e.start > 1000
        );

        if (hasProgress) {
          const res = await upsertPomodoroSession(
            {
              id: sessionId,
              courseId: selectedCourse.id,
              timeline,
              startedAt: startTime || Date.now(),
            },
            userId
          );

          if (res && "error" in res && res.error) {
            toast.error("Gün sonu kaydı başarısız oldu: " + res.error);
            return;
          }
          toast.success("Gün başarıyla tamamlandı!");
        }
      }
      resetTimer();
      setMode("work");
    },
    isOpen: isWidgetOpen,
    setOpen: setWidgetOpen,
    streak,
  };
}
