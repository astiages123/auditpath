import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database.types';
import {
  calculatePauseCount,
  calculateSessionTotals,
  getCycleCount,
} from '@/features/pomodoro/logic/sessionMath';
import { calculateFocusPower } from '@/features/efficiency/logic/metricsCalc';
import type {
  RecentSession,
  TimelineBlock,
} from '@/features/pomodoro/types/pomodoroTypes';
import {
  TimelineEventSchema,
  type ValidatedTimelineEvent,
} from '../types/pomodoroTypes';
import { isValid, parseOrThrow } from '@/utils/validation';
import { logger } from '@/utils/logger';

/**
 * Create or update a pomodoro session.
 *
 * @param session Session data
 * @param userId User ID
 * @returns Created/updated session data and error if any
 */
export async function upsertPomodoroSession(
  session: {
    id: string;
    courseId: string;
    courseName?: string | null;
    timeline: Json[];
    startedAt: string | number | Date;
    isCompleted?: boolean;
  },
  userId: string
) {
  const totals = calculateSessionTotals(session.timeline);
  const pauseCount = calculatePauseCount(session.timeline);

  // Calculate Focus Power (Odak Gücü)
  // Formula: (Work / [Break + Pause]) * 20
  const efficiencyScore = calculateFocusPower(
    totals.totalWork,
    totals.totalBreak,
    totals.totalPause
  );

  // Validate if courseId is a UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let finalCourseId: string | null = session.courseId;
  let finalCourseName = session.courseName;

  if (!uuidRegex.test(session.courseId)) {
    // If not a UUID, it's likely a slug. Try to resolve it.
    const { data: course } = await supabase
      .from('courses')
      .select('id, name')
      .eq('course_slug', session.courseId)
      .maybeSingle();

    if (course) {
      finalCourseId = course.id;
      if (!finalCourseName) finalCourseName = course.name;
    } else {
      // If we can't find it, set to null to avoid Postgres 400 error
      finalCourseId = null;
    }
  }

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .upsert({
      id: session.id,
      user_id: userId,
      course_id: finalCourseId,
      course_name: finalCourseName,
      timeline: session.timeline,
      started_at: new Date(session.startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      total_work_time: totals.totalWork,
      total_break_time: totals.totalBreak,
      total_pause_time: totals.totalPause,
      pause_count: pauseCount,
      efficiency_score: efficiencyScore,
      last_active_at: new Date().toISOString(),
      is_completed: session.isCompleted || false,
    })
    .select()
    .single();

  return { data, error: error?.message };
}

/**
 * Get the latest active (not completed) session for a user.
 *
 * @param userId User ID
 * @returns Latest active session or null
 */
export async function getLatestActiveSession(userId: string) {
  const { data } = await supabase
    .from('pomodoro_sessions')
    .select('*, course:courses(*, category:categories(*))')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .neq('is_completed', true)
    .limit(1)
    .maybeSingle();

  return data;
}

/**
 * Delete a pomodoro session.
 *
 * @param sessionId Session ID to delete
 */
export async function deletePomodoroSession(sessionId: string) {
  const { error } = await supabase
    .from('pomodoro_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) logger.error('Error deleting session:', error);
}

/**
 * Update the heartbeat timestamp for zombie session detection.
 * Should be called every 30 seconds during active sessions.
 *
 * @param sessionId Session ID
 * @param stats Optional efficiency and pause time stats
 */
export async function updatePomodoroHeartbeat(
  sessionId: string,
  stats?: {
    efficiency_score?: number;
    total_paused_time?: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from('pomodoro_sessions')
    .update({
      last_active_at: new Date().toISOString(),
      ...(stats?.efficiency_score !== undefined
        ? { efficiency_score: stats.efficiency_score }
        : {}),
      ...(stats?.total_paused_time !== undefined
        ? { total_pause_time: stats.total_paused_time }
        : {}),
    })
    .eq('id', sessionId);

  if (error) {
    // Heartbeat failed
  }
}

/**
 * Get the count of pomodoro cycles completed today.
 * Uses virtual day logic (day starts at 04:00 AM).
 *
 * @param userId User ID
 * @returns Number of cycles completed today
 */
export async function getDailySessionCount(userId: string) {
  const now = new Date();
  const today = new Date(now);

  // Virtual Day Logic: Day starts at 04:00 AM
  if (now.getHours() < 4) {
    today.setDate(today.getDate() - 1);
  }
  today.setHours(4, 0, 0, 0);

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('timeline')
    .eq('user_id', userId)
    .gte('started_at', today.toISOString());

  if (error) {
    return 0;
  }

  // Count work cycles in all sessions today
  const totalCycles = (data || []).reduce(
    (acc, s) => acc + getCycleCount(s.timeline),
    0
  );
  return totalCycles;
}

/**
 * Get recent pomodoro sessions with timeline data.
 *
 * @param userId User ID
 * @param limit Maximum number of sessions to return
 * @returns Array of timeline blocks
 */
export async function getRecentSessions(
  userId: string,
  limit: number = 20
): Promise<TimelineBlock[]> {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select(
      'id, course_name, started_at, ended_at, total_work_time, total_break_time, total_pause_time, timeline'
    )
    .eq('user_id', userId)
    .or('total_work_time.gte.60,total_break_time.gte.60') // Molaları da getir
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    logger.error('Error fetching recent sessions:', error);
    return [];
  }

  return (
    data as {
      id: string;
      course_name: string | null;
      started_at: string;
      ended_at: string;
      total_work_time: number | null;
      total_break_time: number | null;
      total_pause_time: number | null;
      timeline: Json;
    }[]
  ).map((s) => {
    // Trust DB columns as the primary source of truth for finished sessions to match getDailyStats
    const workTime = s.total_work_time || 0;
    const breakTime = s.total_break_time || 0;
    const pauseTime = s.total_pause_time || 0;

    let timeline: Json[] = [];
    if (Array.isArray(s.timeline)) {
      timeline = s.timeline;
    } else if (typeof s.timeline === 'string') {
      try {
        timeline = JSON.parse(s.timeline);
      } catch (e) {
        logger.error('Failed to parse timeline string:', e as Error);
      }
    }

    const validatedTimeline = (timeline as Json[])
      .map((e) => {
        if (isValid(TimelineEventSchema, e)) {
          return parseOrThrow(TimelineEventSchema, e);
        }
        return null;
      })
      .filter((e): e is ValidatedTimelineEvent => e !== null);

    // Calculate true start/end from timeline if possible to avoid scaling issues in Gantt Chart
    // especially when session was paused and resumed (which updates started_at)
    let startTime = s.started_at;
    let endTime = s.ended_at;

    if (validatedTimeline.length > 0) {
      const tStart = Math.min(...validatedTimeline.map((e) => e.start));
      const tEnd = Math.max(...validatedTimeline.map((e) => e.end ?? e.start));

      if (tStart < Infinity) {
        startTime = new Date(
          Math.min(new Date(s.started_at).getTime(), tStart)
        ).toISOString();
      }
      if (tEnd > -Infinity) {
        endTime = new Date(
          Math.max(new Date(s.ended_at).getTime(), tEnd)
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
  });
}

/**
 * Get recent activity sessions for dashboard.
 *
 * @param userId User ID
 * @param limit Maximum number of sessions to return
 * @returns Array of recent sessions
 */
export async function getRecentActivitySessions(
  userId: string,
  limit: number = 5
): Promise<RecentSession[]> {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select(
      'id, course_name, started_at, total_work_time, total_break_time, total_pause_time, pause_count, efficiency_score, timeline'
    )
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Error fetching recent activity sessions:', error);
    return [];
  }

  return (data || []).map((s) => ({
    id: s.id,
    courseName: s.course_name || 'Bilinmeyen Ders',
    date: s.started_at,
    durationMinutes: Math.round((s.total_work_time || 0) / 60),
    efficiencyScore: s.efficiency_score || 0,
    timeline: Array.isArray(s.timeline) ? (s.timeline as Json[]) : [],
    totalWorkTime: s.total_work_time || 0,
    totalBreakTime: s.total_break_time || 0,
    totalPauseTime: s.total_pause_time || 0,
    pauseCount: s.pause_count || 0,
  }));
}
