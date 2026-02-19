import { useEffect, useRef } from 'react';
import {
  useTimerStore,
  usePomodoroSessionStore,
  usePomodoroUIStore,
} from '@/features/pomodoro/store';
import { useAuth } from '@/features/auth/hooks/useAuth';

import {
  getDailySessionCount,
  getLatestActiveSession,
  updatePomodoroHeartbeat,
} from '@/features/pomodoro/services/pomodoroService';
import { calculateSessionTotals } from '@/features/pomodoro/logic/sessionMath';
import { toast } from 'sonner';
import { env } from '@/utils/env';
import { SESSION_VALIDITY_DURATION_MS } from '@/utils/constants';

import { useFaviconManager } from '@/features/pomodoro/hooks/useFaviconManager';
import { playNotificationSound } from '../logic/audioUtils';
import { logger } from '@/utils/logger';
import faviconSvg from '@/assets/favicon.svg';

export function TimerController() {
  // Timer state
  const { isActive, timeLeft, isBreak, duration, startTime } = useTimerStore();
  const tick = useTimerStore((state) => state.tick);

  // Session state
  const {
    sessionId,
    timeline,
    originalStartTime,
    setSessionCount,
    setSessionId,
    setHasRestored,
    hasRestored,
  } = usePomodoroSessionStore();

  // UI state
  const { selectedCourse, setCourse } = usePomodoroUIStore();

  // Dynamic Favicon & Title Manager
  useFaviconManager(
    timeLeft,
    duration,
    isActive,
    isBreak ? 'break' : 'work',
    isActive && !!sessionId
  );

  const { user, session } = useAuth();
  const userId = user?.id;

  // To prevent double notifications for the same event
  const lastNotifiedRef = useRef<string | null>(null);

  // 1. Core Tick using Web Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../../../../workers/timerWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent<string>) => {
      if (e.data === 'TICK') {
        tick();
      }
    };

    if (isActive) {
      worker.postMessage('START');
    } else {
      worker.postMessage('STOP');
    }

    return () => {
      worker.onmessage = null;
      worker.postMessage('STOP');
      worker.terminate();
    };
  }, [isActive, tick]);

  // 2. Initial Sync & Restore
  useEffect(() => {
    if (!userId) return;

    const sync = async () => {
      // Sync daily count
      const count = await getDailySessionCount(userId);
      if (!sessionId) {
        setSessionCount(count + 1);
      } else {
        setSessionCount(count || 1);
      }

      // Restore active session if idle
      if (!hasRestored && !window._isPomodoroRestoring) {
        setHasRestored(true);
        window._isPomodoroRestoring = true;

        if (!isActive && !sessionId) {
          try {
            const activeSession = await getLatestActiveSession(userId);
            if (activeSession) {
              const sessionAge =
                Date.now() - new Date(activeSession.started_at).getTime();
              const isRecent = sessionAge < SESSION_VALIDITY_DURATION_MS;

              if (isRecent) {
                // Double check if we already have a session in local state avoiding race connection
                if (usePomodoroSessionStore.getState().sessionId) return;

                setSessionId(activeSession.id);
                if (
                  activeSession.course_id &&
                  activeSession.course_name &&
                  !selectedCourse
                ) {
                  setCourse({
                    id: activeSession.course_id,
                    name: activeSession.course_name,
                    category: activeSession.course?.category?.name || 'General',
                  });
                }

                // Restore timeline if available to ensure pause calculations are correct
                if (
                  activeSession.timeline &&
                  Array.isArray(activeSession.timeline)
                ) {
                  usePomodoroSessionStore.setState({
                    timeline: activeSession.timeline as {
                      type: 'work' | 'break' | 'pause';
                      start: number;
                      end?: number;
                    }[],
                  });
                }

                toast.info('Önceki oturumunuzdan devam ediliyor.');
              }
            }
          } catch (e: unknown) {
            logger.error('Restoration failed', e as Error);
          } finally {
            window._isPomodoroRestoring = false;
          }
        } else {
          window._isPomodoroRestoring = false;
        }
      }
    };

    sync();
  }, [
    userId,
    sessionId,
    isActive,
    hasRestored,
    setSessionCount,
    setSessionId,
    setCourse,
    setHasRestored,
    selectedCourse,
  ]);

  // 3. Heartbeat & Stats Sync
  useEffect(() => {
    if (!sessionId || !isActive) return;

    const heartbeatInterval = setInterval(() => {
      // Calculate current stats from timeline
      const now = Date.now();
      const currentTimeline = timeline.map((e) => ({
        ...e,
        end: e.end || now,
      }));
      const { totalWork, totalBreak, totalPause } =
        calculateSessionTotals(currentTimeline);

      // Efficiency = Total Work / (Total Work + Total Break + Total Pause)
      const totalDuration = totalWork + totalBreak + totalPause;
      const efficiency =
        totalDuration > 0 ? (totalWork / totalDuration) * 100 : 100;

      updatePomodoroHeartbeat(sessionId, {
        efficiency_score: Math.round(efficiency),
        total_paused_time: totalPause,
      });
    }, 30000);

    return () => clearInterval(heartbeatInterval);
  }, [sessionId, isActive, timeline]);

  // 4. Session Completion & Notifications
  useEffect(() => {
    const checkCompletion = () => {
      // We use <= 0 to catch any skips
      if (timeLeft <= 0 && isActive) {
        const uniqueSessionKey =
          sessionId ||
          `anonymous-${originalStartTime || startTime || 'unknown'}`;
        const notificationKey = `${uniqueSessionKey}-${isBreak ? 'break' : 'work'}`;

        // PREVENT DOUBLE FIRE
        if (lastNotifiedRef.current === notificationKey) return;
        lastNotifiedRef.current = notificationKey;

        const message = !isBreak
          ? 'Harika iş çıkardın! Şimdi kısa bir mola zamanı. ☕'
          : 'Mola bitti, tekrar odaklanmaya hazır mısın? 💪';

        // Sonner Toast
        toast.success(message, { duration: 2000 });

        // Notification Tool
        const sendNotification = () => {
          if (
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            try {
              const notification = new Notification('Pomodoro: Süre Doldu!', {
                body: message,
                icon: faviconSvg,
                tag: notificationKey,
                requireInteraction: true,
              });

              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            } catch (e: unknown) {
              logger.error('Desktop Notification failed', e as Error);
            }
          }
        };

        if (Notification.permission === 'granted') {
          sendNotification();
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') sendNotification();
          });
        }

        playNotificationSound();
      }
    };

    checkCompletion();

    // Catch-up when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkCompletion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [
    timeLeft,
    isActive,
    isBreak,
    sessionId,
    userId,
    selectedCourse,
    timeline,
    originalStartTime,
    startTime,
  ]);

  // 5. Beacon (Safety Save)
  useEffect(() => {
    const handleUnload = () => {
      if (userId && sessionId && selectedCourse && timeline.length > 0) {
        const now = Date.now();
        // Ensure all timeline entries are closed for the safety save
        const closedTimeline = timeline.map((e) => ({
          ...e,
          end: e.end || now,
        }));

        const { totalWork, totalBreak, totalPause } =
          calculateSessionTotals(closedTimeline);
        const payload = {
          id: sessionId,
          user_id: userId,
          course_id: selectedCourse.id,
          course_name: selectedCourse.name,
          timeline: closedTimeline,
          started_at: new Date(
            originalStartTime || startTime || now
          ).toISOString(),
          ended_at: new Date(now).toISOString(),
          total_work_time: totalWork,
          total_break_time: totalBreak,
          total_pause_time: totalPause,
          is_completed: false,
        };

        const supabaseUrl = env.supabase.url;
        const supabaseKey = env.supabase.anonKey;

        fetch(`${supabaseUrl}/rest/v1/pomodoro_sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${session?.access_token || supabaseKey}`,
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch((err: unknown) => logger.error('Beacon Error:', err as Error));
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [
    userId,
    sessionId,
    selectedCourse,
    timeline,
    startTime,
    originalStartTime,
    session,
  ]);

  return null;
}
