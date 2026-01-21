import { useEffect, useCallback, useState, useRef } from "react";
import { useTimerStore } from "@/store/useTimerStore";
import {
  getDailySessionCount,
  getLatestActiveSession,
  upsertPomodoroSession,
  getStreak,
  deletePomodoroSession,
} from "@/lib/client-db";
import { calculateSessionTotals } from "@/lib/pomodoro-utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export type PomodoroMode = "work" | "break";

// ... (playNotificationSound stays same)

const playNotificationSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // 3 tane net biip sesi (0.5 saniye arayla)
    for (let i = 0; i < 3; i++) {
      playNote(1046.50, now + (i * 0.5), 0.3); // C6 notası
    }
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
    endTime
  } = useTimerStore();

  const { user, session } = useAuth();
  const userId = user?.id;
  const [streak, setStreak] = useState(0);

  // Restore active session or sync daily count
  useEffect(() => {
    if (!userId) return;

    // 1. Sync daily session count from DB
    const syncSessionCount = async () => {
      const count = await getDailySessionCount(userId);
      if (!sessionId) {
        setSessionCount(count + 1);
      }
    };
    syncSessionCount();

    // 2. Update Streak
    getStreak(userId).then((s) => setStreak(s));

    // 3. Restore active session if idle
    if (userId && !hasRestored) {
        setHasRestored(true);
        
        // Check local persistence validity
        if (isActive && endTime) {
            const now = Date.now();
            if (now > endTime) {
                 // Session finished while away
                 // We could trigger finish logic here, but for now just let the tick handle it
                 // or maybe just pause it?
                 // Let's settle for simple resume.
            }
        } else if (!sessionId) {
             // Only fetch from DB if we don't have a local active session
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
      endTime
  ]);

  // Sync State to DB
  useEffect(() => {
    if (!userId || !selectedCourse || !sessionId) return;

    const save = async () => {
      const hasStarted = timeline.length > 0;
      if (!hasStarted) return;

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
    sessionId,
    userId,
    timeline,
    selectedCourse,
    startTime,
    originalStartTime,
    // Reduced dependencies to avoid excessive saves on tick updates
    // Removing isActive/isBreak unless they trigger significant state changes captured in timeline
    // Timeline changes when pause/start happens, so that's covered.
  ]);

  // Zombie Session Handling (Beacon)
  useEffect(() => {
      const handleUnload = () => {
          if (userId && sessionId && selectedCourse && timeline.length > 0) {
              const { totalWork, totalBreak, totalPause } = calculateSessionTotals(timeline);
              
              // Construct the payload for Supabase REST API
              const payload = {
                  id: sessionId,
                  user_id: userId,
                  course_id: selectedCourse.id, // Note: This might need UUID resolution if it's a slug, which is tricky synchronously.
                  // Ideally we store UUID in selectedCourse.id.
                  course_name: selectedCourse.name,
                  timeline: timeline,
                  started_at: new Date(originalStartTime || startTime || Date.now()).toISOString(),
                  ended_at: new Date().toISOString(),
                  total_work_time: totalWork,
                  total_break_time: totalBreak,
                  total_pause_time: totalPause,
                  is_completed: false // Not necessarily completed
              };

              const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
              
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              
              // We need to use SendBeacon or fetch with keepalive
              // SendBeacon is more reliable for unload
              // But Supabase expects headers.
              // sendBeacon doesn't support custom headers easily without Blob hack?
              // Actually, standard sendBeacon sends POST.
              // But we need Authorization header if RLS is on, or apikey at least.
              // Supabase allows passing apikey in query param? Yes in some configs.
              // But cleanest is fetch with keepalive: true
              
              fetch(`${supabaseUrl}/rest/v1/pomodoro_sessions`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'apikey': supabaseKey,
                      'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
                      'Prefer': 'resolution=merge-duplicates'
                  },
                  body: JSON.stringify(payload),
                  keepalive: true
              }).catch(err => console.error("Beacon Error:", err));
          }
      };

      window.addEventListener('beforeunload', handleUnload);
      return () => window.removeEventListener('beforeunload', handleUnload);
  }, [userId, sessionId, selectedCourse, timeline, startTime, originalStartTime, session]);


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
    // Request notification permission on user action
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    startTimer();
  };

  // Handle session completion/notifications
  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      const message = !isBreak
        ? "Harika iş çıkardın! Şimdi kısa bir mola zamanı. ☕"
        : "Mola bitti, tekrar odaklanmaya hazır mısın? 💪";

      const sendNotification = () => {
        new Notification("Pomodoro: Süre Doldu!", {
          body: message,
          icon: "/favicon.svg",
        });
      };

      // Always show a toast
      toast.success(message, {
        duration: 10000,
      });

      if (Notification.permission === "granted") {
        sendNotification();
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            sendNotification();
          }
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
        ).then(async (res) => {
          if (res && "error" in res && res.error) {
            toast.error(
              "Oturum kaydedilemedi! Lütfen internet bağlantınızı kontrol edin."
            );
          } else {
            setSessionId(null);
            // Re-fetch actual count from DB for accuracy
            const actualCount = await getDailySessionCount(userId);
            setSessionCount(actualCount + 1);
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
    setSessionCount,
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
    
    // Request notification permission if not already granted
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    if (newMode === "work") {
      if (userId) {
        getDailySessionCount(userId).then(count => {
          setSessionCount(count + 1);
        });
      } else {
        incrementSession();
      }
    }
    // Auto-start timer
    startTimer();
  }, [isBreak, setMode, incrementSession, startTimer, userId, setSessionCount]);

  const resetAndClose = async () => {
    if (userId && sessionId) {
      await deletePomodoroSession(sessionId);
    }
    resetTimer();
    setCourse(null);
    setSessionId(null);
    setHasRestored(true); // Prevent re-restoring after explicit close
    setWidgetOpen(false);
    
    // Refresh count on close/reset to stay synced
    if (userId) {
      const count = await getDailySessionCount(userId);
      setSessionCount(count + 1);
    }
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
