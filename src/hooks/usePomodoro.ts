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
    
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Yumuşak bir "Ding" akoru (A Major)
    playNote(880, now, 1.0); // A5
    playNote(1108.73, now + 0.05, 1.0); // C#6
    playNote(1318.51, now + 0.1, 1.0); // E6
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
    originalStartTime,
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
    hasRestored,
    setHasRestored,
  } = useTimerStore();

  const { user } = useAuth();
  const userId = user?.id;
  const [streak, setStreak] = useState(0);

  // Restore active session or sync daily count


  useEffect(() => {
    if (!userId) return;

    // 1. Sync daily session count from DB
    // We only do this if there's no active session to avoid jumping numbers during a session
    const syncSessionCount = async () => {
      const count = await getDailySessionCount(userId);
      if (sessionId) {
        // If we have an active session, ensure its count is at least the current one
        // and that it matches DB if it was already saved today.
        // For now, we trust the restored sessionCount but count can be used for verification.
        // setSessionCount(count); // Not safe if count includes current session or not
      } else {
        setSessionCount(count + 1);
      }
    };

    syncSessionCount();

    // 2. Update Streak
    getStreak(userId).then((s) => setStreak(s));

    // 3. Restore active session if idle
    if (userId && !hasRestored) {
      if (sessionId || isActive || startTime !== null) {
        // If we already have a session state, don't try to restore
        setHasRestored(true);
      } else {
        // Mark as attempt made immediately to avoid double-triggers
        setHasRestored(true);
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
              toast.info("Önceki oturumunuzdan devam ediliyor.");
            }
          }
        });
      }
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
    hasRestored,
    setHasRestored,
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
          startedAt: originalStartTime || startTime || Date.now(),
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
    originalStartTime,
  ]);

  // Start/Resume Wrapper
  const handleStart = async () => {
    if (!selectedCourse) return;

    // If no session ID, generate it but don't save yet.
    // Auto-save effect will handle the first save once progress starts.
    if (!sessionId) {
      if (userId) {
        const count = await getDailySessionCount(userId);
        setSessionCount(count + 1);
      }
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
            ? "Harika iş çıkardın! Şimdi kısa bir mola zamanı. ☕"
            : "Mola bitti, tekrar odaklanmaya hazır mısın? 💪",
          icon: "/favicon.svg",
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
            startedAt: originalStartTime || startTime || Date.now(),
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
    originalStartTime,
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
    setHasRestored(true); // Prevent re-restoring after explicit close
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
              startedAt: originalStartTime || startTime || Date.now(),
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
    duration,
    timeLeft,
    isOpen: isWidgetOpen,
    setOpen: setWidgetOpen,
    streak,
  };
}
