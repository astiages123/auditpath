import { useCallback } from 'react';
import {
  getDailySessionCount,
  upsertPomodoroSession,
} from '@/features/pomodoro/services/pomodoroService';
import {
  usePomodoroSessionStore,
  usePomodoroUIStore,
} from '@/features/pomodoro/store';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const TimelineEventSchema = z.object({
  type: z.enum(['work', 'break', 'pause']),
  start: z.number(),
  end: z.number().optional(),
});
const TimelineSchema = z.array(TimelineEventSchema);

/**
 * Hook to manage Pomodoro session persistence and lifecycle.
 */
export function usePomodoroSession(userId: string | undefined) {
  const {
    sessionId,
    setSessionId,
    setSessionCount,
    timeline,
    originalStartTime,
    addTimelineEvent,
  } = usePomodoroSessionStore();

  const { selectedCourse } = usePomodoroUIStore();

  const initializeSession = useCallback(async () => {
    if (!selectedCourse || !userId) return null;

    const now = Date.now();
    let currentSessionId = sessionId;

    if (!currentSessionId) {
      const count = await getDailySessionCount(userId);
      setSessionCount(count + 1);
      currentSessionId = crypto.randomUUID();
      setSessionId(currentSessionId);
      addTimelineEvent({ type: 'work', start: now });
    }

    try {
      await upsertPomodoroSession(
        {
          id: currentSessionId,
          courseId: selectedCourse.id,
          courseName: selectedCourse.name,
          timeline: TimelineSchema.parse(
            timeline.length > 0 ? timeline : [{ type: 'work', start: now }]
          ),
          startedAt: originalStartTime || now,
          isCompleted: false,
        },
        userId
      );
    } catch (error) {
      logger.error('Failed to upsert session:', error as Error);
    }

    return currentSessionId;
  }, [
    userId,
    selectedCourse,
    sessionId,
    timeline,
    originalStartTime,
    setSessionCount,
    setSessionId,
    addTimelineEvent,
  ]);

  return {
    initializeSession,
  };
}
