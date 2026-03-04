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
import {
  POMODORO_BREAK_DURATION_SECONDS,
  POMODORO_WORK_DURATION_SECONDS,
} from '../utils/constants';

import { usePomodoroWorker } from '../hooks/usePomodoroWorker';
import { logger } from '@/utils/logger';

// ===========================
// === COMPONENT DEFINITION ===
// ===========================

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

  const { start, pause } = usePomodoroWorker(tick);

  // 1. Core Tick Control
  useEffect(() => {
    if (isActive) {
      start();
    } else {
      pause();
    }
  }, [isActive, start, pause]);

  // 2. Initial Sync & Restore
  useEffect(() => {
    async function loadData() {
      if (!userId) return;

      try {
        // 1. Sync daily count
        const count = await getDailySessionCount(userId);
        if (!sessionId) {
          setSessionCount(count + 1);
        } else {
          setSessionCount(count || 1);
        }

        // 2. Restore active session if idle
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
                  // Consolidate updates to stores
                  usePomodoroSessionStore.setState({
                    sessionId: activeSession.id,
                    timeline:
                      (activeSession.timeline as {
                        type: 'work' | 'break' | 'pause';
                        start: number;
                        end?: number;
                      }[]) || [],
                  });

                  if (
                    activeSession.course_id &&
                    activeSession.course_name &&
                    !selectedCourse
                  ) {
                    setCourse({
                      id: activeSession.course_id,
                      name: activeSession.course_name,
                      category:
                        activeSession.course?.category?.name || 'General',
                    });
                  }

                  // --- RESTORE TIMER STATE FROM TIMELINE ---
                  const timelineArray =
                    (activeSession.timeline as {
                      type: 'work' | 'break' | 'pause';
                      start: number;
                      end?: number;
                    }[]) || [];
                  if (timelineArray.length > 0) {
                    let currentMode: 'work' | 'break' = 'work';
                    let elapsedMsInMode = 0;
                    let isActiveStatus = false;
                    let foundModeStart = false;
                    let lastPauseStartTime: number | null = null;

                    for (let i = timelineArray.length - 1; i >= 0; i--) {
                      const event = timelineArray[i];

                      if (!foundModeStart) {
                        if (event.type === 'work' || event.type === 'break') {
                          currentMode = event.type;
                          foundModeStart = true;
                          isActiveStatus = !event.end;
                        } else if (event.type === 'pause') {
                          isActiveStatus = false;
                          if (!lastPauseStartTime)
                            lastPauseStartTime = event.start;
                        }
                      }

                      if (foundModeStart) {
                        if (event.type === currentMode) {
                          const eEnd = event.end || Date.now();
                          elapsedMsInMode += eEnd - event.start;
                        } else if (event.type === 'pause') {
                          // No-op
                        } else {
                          break;
                        }
                      }
                    }

                    const isBreakMode = currentMode === 'break';
                    const modeDuration = isBreakMode
                      ? POMODORO_BREAK_DURATION_SECONDS
                      : POMODORO_WORK_DURATION_SECONDS;
                    const elapsedSeconds = Math.floor(elapsedMsInMode / 1000);
                    const restoredTimeLeft = modeDuration - elapsedSeconds;

                    const storeTimer = useTimerStore.getState();
                    const restoredStartTime = isActiveStatus
                      ? Date.now()
                      : null;
                    const restoredEndTime = isActiveStatus
                      ? Date.now() + restoredTimeLeft * 1000
                      : null;

                    storeTimer.restoreState(
                      restoredTimeLeft,
                      isActiveStatus,
                      isBreakMode,
                      modeDuration,
                      restoredStartTime,
                      restoredEndTime,
                      lastPauseStartTime
                    );
                  }
                  toast.info('Önceki oturumunuzdan devam ediliyor.');
                }
              }
            } catch (error: unknown) {
              console.error('[TimerController][loadData] Hata:', error);
              logger.error(
                'TimerController',
                'loadData',
                'Restoration failed',
                error as Error
              );
            } finally {
              window._isPomodoroRestoring = false;
            }
          } else {
            window._isPomodoroRestoring = false;
          }
        }
      } catch (error: unknown) {
        console.error('[TimerController][loadData] Hata:', error);
        logger.error(
          'TimerController',
          'loadData',
          'Initial sync failed',
          error as Error
        );
      }
    }

    loadData();
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
