import { useEffect } from 'react';
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
import { toast } from 'sonner';
import { SESSION_VALIDITY_DURATION_MS } from '@/utils/constants';

import { useFaviconManager } from '@/features/pomodoro/hooks/useFaviconManager';
import { useTimerNotifications } from '@/features/pomodoro/hooks/useTimerNotifications';
import { useTimerPersistence } from '@/features/pomodoro/hooks/useTimerPersistence';
import { calculateSessionTotals } from '../logic/sessionMath';

import { logger } from '@/utils/logger';

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

  const { user, session } = useAuth();
  const userId = user?.id;

  // Dynamic Favicon & Title Manager
  useFaviconManager(
    timeLeft,
    duration,
    isActive,
    isBreak ? 'break' : 'work',
    isActive && !!sessionId
  );

  // Notifications Manager
  useTimerNotifications({
    timeLeft,
    isActive,
    isBreak,
    sessionId,
    originalStartTime,
    startTime,
  });

  // Persistence (Safety Save) Manager
  useTimerPersistence({
    userId,
    sessionId,
    selectedCourse,
    timeline,
    startTime,
    originalStartTime,
    accessToken: session?.access_token,
  });

  // 1. Core Tick using Web Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../logic/timerWorker.ts', import.meta.url),
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

  return null;
}
