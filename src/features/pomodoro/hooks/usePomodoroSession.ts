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
import { TimelineEventSchema } from '../types/pomodoroTypes';
import { z } from 'zod';
import { Json } from '@/types/database.types';

const TimelineArraySchema = z.array(TimelineEventSchema);

// ===========================
// === HOOK DEFINITION ===
// ===========================

/**
 * Hook to manage Pomodoro session persistence and lifecycle.
 * Automatically synchronizes session state with Supabase.
 *
 * @param userId - ID of the authenticated user
 * @returns Object providing session initialization methods
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
      // Validate and cast timeline prior to DB upsert
      const parsedTimeline = TimelineArraySchema.parse(
        timeline.length > 0 ? timeline : [{ type: 'work', start: now }]
      );
      const timelineAsJson: Json[] = parsedTimeline.map((timelineEvent) => ({
        type: timelineEvent.type,
        start: timelineEvent.start,
        end: timelineEvent.end ?? null,
        duration: timelineEvent.duration ?? null,
      }));

      await upsertPomodoroSession(
        {
          id: currentSessionId,
          courseId: selectedCourse.id,
          courseName: selectedCourse.name,
          timeline: timelineAsJson,
          startedAt: originalStartTime || now,
          isCompleted: false,
        },
        userId
      );
    } catch (error: unknown) {
      console.error('[usePomodoroSession][initializeSession] Hata:', error);
      logger.error(
        'UsePomodoroSession',
        'initializeSession',
        'Failed to upsert session',
        error as Error
      );
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
