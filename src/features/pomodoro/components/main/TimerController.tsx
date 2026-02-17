import { useEffect, useRef } from 'react';
import { useTimerStore } from '@/store/useTimerStore';
import { useAuth } from '@/features/auth/hooks/useAuth';

import {
  getDailySessionCount,
  getLatestActiveSession,
  updatePomodoroHeartbeat,
} from '@/features/pomodoro/services/pomodoroService';
import { calculateSessionTotals } from '@/utils/math';
import { toast } from 'sonner';
import { env } from '@/utils/env';
import { SESSION_VALIDITY_DURATION_MS } from '@/utils/constants';

import { useFaviconManager } from '@/features/pomodoro/hooks/useFaviconManager';
import { playNotificationSound } from '../../utils/audioUtils';
import { logger } from '@/utils/logger';
import faviconSvg from '@/assets/favicon.svg';

export function TimerController() {
  const {
    isActive,
    tick,
    timeLeft,
    isBreak,
    sessionId,
    duration,
    selectedCourse,
    timeline,
    originalStartTime,
    startTime,
    setSessionCount,
    setSessionId,
    setCourse,
    hasRestored,
    setHasRestored,
  } = useTimerStore();

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

    worker.onmessage = (e) => {
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
                if (useTimerStore.getState().sessionId) return;

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
                  useTimerStore.setState({
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
          } catch (e) {
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
      // We need to calculate pause time dynamically
      timeline.reduce((acc, event) => {
        if (event.type === 'pause') {
          const end = event.end || Date.now();
          return acc + (end - event.start);
        }
        return acc;
      }, 0);

      // Calculate efficiency (work / (work + break + pause))
      // This is an approximation since we don't have the exact closed timeline here easily without duplicating logic
      // But we can estimate or just send pause time for now as requested.
      // Let's use the helper if we can, or just send pause time.
      // The prompt asked for: "efficiency_score ve total_paused_time"

      // Re-calculating full stats might be heavy every 30s but acceptable.
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
        // Use sessionId if available, otherwise fallback to startTime or a random string for this session instance if needed.
        // Since this component re-mounts or startTime might change, we need a stable key for THIS specific completion event.
        // Using startTime + mode is a good proxy for a unique session instance if sessionId is missing.
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
                tag: notificationKey, // Same tag prevents duplicate notifications
                requireInteraction: true, // Keep notification until user interacts
              });

              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            } catch (e) {
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
        } else if (Notification.permission === 'denied') {
          // Optional: We could log this or just ignore since we already toasted
          // toast.error("Masaüstü bildirimleri tarayıcı tarafından engellenmiş!");
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
        }).catch((err) => logger.error('Beacon Error:', err));
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
