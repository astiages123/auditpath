import {
  calculatePauseCount,
  calculateSessionTotals,
  TimelineEvent,
} from '@/features/pomodoro/logic/sessionMath';
import { calculateFocusPower } from '@/features/statistics/logic/metricsCalc';
import {
  TimelineEventSchema,
  ValidatedTimelineEvent,
} from '../types/pomodoroTypes';
import { isValid, parseOrThrow } from '@/utils/validation';
import type { Json } from '@/types/database.types';
import type {
  RecentSession,
  TimelineBlock,
} from '@/features/pomodoro/types/pomodoroTypes';
import { logger } from '@/utils/logger';

/**
 * Parses timeline events from a JSON array with validation.
 */
export const parseTimelineEventsFromJson = (
  timeline: Json[]
): TimelineEvent[] => {
  return timeline
    .map((timelineEntry: Json) => {
      if (isValid(TimelineEventSchema, timelineEntry)) {
        return parseOrThrow(TimelineEventSchema, timelineEntry);
      }
      return null;
    })
    .filter(
      (timelineEntry): timelineEntry is TimelineEvent => timelineEntry !== null
    );
};

/**
 * Calculates essential session metrics for persistence.
 */
export const calculateSessionMetrics = (parsedTimeline: TimelineEvent[]) => {
  const totals = calculateSessionTotals(parsedTimeline);
  const pauseCount = calculatePauseCount(parsedTimeline);
  const efficiencyScore = calculateFocusPower(
    totals.totalWork,
    totals.totalBreak,
    totals.totalPause
  );

  return {
    totals,
    pauseCount,
    efficiencyScore,
  };
};

/**
 * Formats a raw database row into a TimelineBlock for the UI.
 */
export const mapRowToTimelineBlock = (s: {
  id: string;
  course_name: string | null;
  started_at: string;
  ended_at: string;
  total_work_time: number | null;
  total_break_time: number | null;
  total_pause_time: number | null;
  timeline: Json;
}): TimelineBlock => {
  const workTime = s.total_work_time || 0;
  const breakTime = s.total_break_time || 0;
  const pauseTime = s.total_pause_time || 0;

  let timeline: Json[] = [];
  if (Array.isArray(s.timeline)) {
    timeline = s.timeline;
  } else if (typeof s.timeline === 'string') {
    try {
      timeline = JSON.parse(s.timeline);
    } catch (e: unknown) {
      logger.error(
        'PomodoroLogic',
        'mapRowToTimelineBlock',
        'Failed to parse timeline string',
        e as Error
      );
    }
  }

  const validatedTimeline = timeline
    .map((timelineEntry) => {
      if (isValid(TimelineEventSchema, timelineEntry)) {
        return parseOrThrow(TimelineEventSchema, timelineEntry);
      }
      return null;
    })
    .filter(
      (timelineEntry): timelineEntry is ValidatedTimelineEvent =>
        timelineEntry !== null
    );

  let startTime = s.started_at;
  let endTime = s.ended_at;

  if (validatedTimeline.length > 0) {
    const timelineStart = Math.min(
      ...validatedTimeline.map((timelineEntry) => timelineEntry.start)
    );
    const timelineEnd = Math.max(
      ...validatedTimeline.map(
        (timelineEntry) => timelineEntry.end ?? timelineEntry.start
      )
    );

    if (timelineStart < Infinity) {
      startTime = new Date(
        Math.min(new Date(s.started_at).getTime(), timelineStart)
      ).toISOString();
    }
    if (timelineEnd > -Infinity) {
      endTime = new Date(
        Math.max(new Date(s.ended_at).getTime(), timelineEnd)
      ).toISOString();
    }
  }

  return {
    id: s.id,
    courseName: s.course_name || 'Bilinmeyen Ders',
    startTime,
    endTime,
    durationSeconds: workTime,
    totalDurationSeconds: workTime + breakTime + pauseTime,
    pauseSeconds: pauseTime,
    breakSeconds: breakTime,
    type: breakTime > workTime ? 'break' : 'work',
    timeline: validatedTimeline,
  };
};

/**
 * Formats a raw database row into a RecentSession for dashboard display.
 */
export const mapRowToRecentSession = (s: {
  id: string;
  course_name: string | null;
  started_at: string;
  total_work_time: number | null;
  total_break_time: number | null;
  total_pause_time: number | null;
  pause_count: number | null;
  efficiency_score: number | null;
  timeline: Json;
}): RecentSession => {
  const workSeconds = s.total_work_time || 0;
  const breakSeconds = s.total_break_time || 0;
  const pauseSeconds = s.total_pause_time || 0;

  const efficiencyScore =
    s.efficiency_score && s.efficiency_score > 0
      ? s.efficiency_score
      : calculateFocusPower(workSeconds, breakSeconds, pauseSeconds);

  return {
    id: s.id,
    courseName: s.course_name || 'Bilinmeyen Ders',
    date: s.started_at,
    durationMinutes: Math.round(workSeconds / 60),
    efficiencyScore,
    timeline: Array.isArray(s.timeline) ? (s.timeline as Json[]) : [],
    totalWorkTime: workSeconds,
    totalBreakTime: breakSeconds,
    totalPauseTime: pauseSeconds,
    pauseCount: s.pause_count || 0,
  };
};
