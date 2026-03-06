import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database.types';
import { getCycleCount } from '@/features/pomodoro/logic/sessionMath';
import type {
  RecentSession,
  TimelineBlock,
} from '@/features/pomodoro/types/pomodoroTypes';
import { getAppDayStart } from '@/utils/dateUtils';
import { logger } from '@/utils/logger';
import {
  calculateSessionMetrics,
  mapRowToRecentSession,
  mapRowToTimelineBlock,
  parseTimelineEventsFromJson,
} from '../logic/pomodoroLogic';

type CourseLookupRow = {
  id: string;
  name: string | null;
};

type RecentSessionRow = {
  id: string;
  course_name: string | null;
  started_at: string;
  total_work_time: number | null;
  total_break_time: number | null;
  total_pause_time: number | null;
  pause_count: number | null;
  efficiency_score: number | null;
  timeline: Json;
};

type TimelineBlockRow = {
  id: string;
  course_name: string | null;
  started_at: string;
  ended_at: string;
  total_work_time: number | null;
  total_break_time: number | null;
  total_pause_time: number | null;
  timeline: Json;
};

/**
 * Parameters for upserting a pomodoro session to the database.
 */
export interface UpsertSessionParams {
  id: string;
  courseId: string;
  courseName?: string | null;
  timeline: Json[];
  startedAt: string | number | Date;
  isCompleted?: boolean;
}

/**
 * Partial data of a session payload for beacon API request.
 */
export interface PomodoroBeaconPayload {
  id: string;
  user_id: string;
  course_id: string | null;
  course_name: string | null;
  timeline: Json[];
  started_at: string;
  ended_at: string;
  total_work_time: number;
  total_break_time: number;
  total_pause_time: number;
  is_completed: boolean;
}

/**
 * Heartbeat stats parameter for updating the active session.
 */
export interface HeartbeatStats {
  efficiency_score?: number;
  total_paused_time?: number;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PENDING_KEY = 'pomodoro_pending_sessions';

function toError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

async function resolveCourse(
  courseId: string,
  courseName?: string | null
): Promise<{ finalCourseId: string | null; finalCourseName: string | null }> {
  let finalCourseId: string | null = courseId;
  let finalCourseName = courseName || null;

  if (UUID_REGEX.test(courseId)) {
    return { finalCourseId, finalCourseName };
  }

  const { data: course, error } = await supabase
    .from('courses')
    .select('id, name')
    .eq('course_slug', courseId)
    .maybeSingle<CourseLookupRow>();

  if (error) {
    logger.error(
      'PomodoroService',
      'upsertPomodoroSession',
      'Error finding course by slug',
      error
    );
    throw toError(error, 'Error finding course by slug');
  }

  if (!course) {
    return { finalCourseId: null, finalCourseName };
  }

  finalCourseId = course.id;
  if (!finalCourseName) {
    finalCourseName = course.name;
  }

  return { finalCourseId, finalCourseName };
}

/**
 * Create or update a pomodoro session.
 *
 * @param session Session data mapped from memory
 * @param userId User ID of the currently authenticated user
 * @returns Created/updated session data and error if any
 */
export async function upsertPomodoroSession(
  session: UpsertSessionParams,
  userId: string
) {
  const parsedTimeline = parseTimelineEventsFromJson(session.timeline);
  const { totals, pauseCount, efficiencyScore } =
    calculateSessionMetrics(parsedTimeline);
  const { finalCourseId, finalCourseName } = await resolveCourse(
    session.courseId,
    session.courseName
  );

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .upsert({
      id: session.id,
      user_id: userId,
      course_id: UUID_REGEX.test(finalCourseId || '') ? finalCourseId : null,
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

  if (error) {
    logger.error(
      'PomodoroService',
      'upsertPomodoroSession',
      'Error upserting session',
      error
    );
    throw toError(error, 'Error upserting session');
  }

  return { data, error: null };
}

/**
 * Get the latest active (not completed) session for a user.
 *
 * @param userId User ID
 * @returns Latest active session or null
 */
export async function getLatestActiveSession(userId: string) {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('*, course:courses(*, category:categories(*))')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .neq('is_completed', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error(
      'PomodoroService',
      'getLatestActiveSession',
      'Error fetching active session',
      error
    );
    throw toError(error, 'Error fetching active session');
  }

  return data;
}

/**
 * Delete a pomodoro session.
 *
 * @param sessionId Session ID to delete
 */
export async function deletePomodoroSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('pomodoro_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    logger.error(
      'PomodoroService',
      'deletePomodoroSession',
      'Error deleting session',
      error
    );
    throw toError(error, 'Error deleting session');
  }
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
  stats?: HeartbeatStats
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
    logger.error(
      'PomodoroService',
      'updatePomodoroHeartbeat',
      'Heartbeat failed',
      error
    );
    throw toError(error, 'Heartbeat failed');
  }
}

/**
 * Save podomoro session via fetch (beacon style) for beforeunload.
 *
 * @param payload Session data to save
 * @param supabaseUrl Supabase project URL
 * @param supabaseKey Supabase anon key
 * @param accessToken User access token
 */
export function saveSessionBeacon(
  payload: PomodoroBeaconPayload,
  supabaseUrl: string,
  supabaseKey: string,
  accessToken: string
): void {
  void fetch(`${supabaseUrl}/rest/v1/pomodoro_sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).then((response) => {
    if (!response.ok) {
      const errorObject = new Error('Beacon API request failed');
      logger.error(
        'PomodoroService',
        'saveSessionBeacon',
        'Beacon API request failed',
        errorObject
      );
      throw errorObject;
    }
  });
}

/**
 * Save podomoro session to local storage as a fail-safe.
 *
 * @param payload Session data to save locally
 */
export function saveSessionToLocalQueue(payload: PomodoroBeaconPayload): void {
  const existing = localStorage.getItem(PENDING_KEY);
  const sessions: PomodoroBeaconPayload[] = existing
    ? JSON.parse(existing)
    : [];

  if (!sessions.some((session) => session.id === payload.id)) {
    sessions.push(payload);
    localStorage.setItem(PENDING_KEY, JSON.stringify(sessions));
    logger.info(
      'PomodoroService',
      'saveSessionToLocalQueue',
      'Session saved to local storage',
      { sessionId: payload.id }
    );
  }
}

/**
 * Sync pending sessions from local storage to the database.
 *
 * @param userId User ID for ownership validation
 */
export async function syncPendingSessions(userId: string): Promise<void> {
  const existing = localStorage.getItem(PENDING_KEY);
  if (!existing) return;

  const sessions: PomodoroBeaconPayload[] = JSON.parse(existing);
  if (sessions.length === 0) return;

  logger.info(
    'PomodoroService',
    'syncPendingSessions',
    `Syncing ${sessions.length} pending sessions`
  );

  const successfulIds: string[] = [];

  for (const session of sessions) {
    if (session.user_id !== userId) continue;

    const upsertParams: UpsertSessionParams = {
      id: session.id,
      courseId: session.course_id || '',
      courseName: session.course_name,
      timeline: session.timeline,
      startedAt: session.started_at,
      isCompleted: session.is_completed,
    };

    await upsertPomodoroSession(upsertParams, userId);
    successfulIds.push(session.id);
  }

  if (successfulIds.length === 0) return;

  const remaining = sessions.filter(
    (session) => !successfulIds.includes(session.id)
  );
  if (remaining.length > 0) {
    localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  } else {
    localStorage.removeItem(PENDING_KEY);
  }

  logger.info(
    'PomodoroService',
    'syncPendingSessions',
    `Synced ${successfulIds.length} sessions`
  );
}

/**
 * Get the count of pomodoro cycles completed today.
 * Uses the shared app day boundary (day starts at 00:00).
 *
 * @param userId User ID
 * @returns Number of cycles completed today
 */
export async function getDailySessionCount(userId: string): Promise<number> {
  const today = getAppDayStart();

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('timeline')
    .eq('user_id', userId)
    .gte('started_at', today.toISOString());

  if (error) {
    logger.error(
      'PomodoroService',
      'getDailySessionCount',
      'Error counting sessions',
      error
    );
    throw toError(error, 'Error counting sessions');
  }

  return (data || []).reduce((accumulator, session) => {
    const parsedTimeline = Array.isArray(session.timeline)
      ? parseTimelineEventsFromJson(session.timeline as Json[])
      : [];
    return accumulator + getCycleCount(parsedTimeline);
  }, 0);
}

/**
 * Get recent pomodoro sessions with formatting for the timeline.
 *
 * @param userId User ID
 * @param limit Maximum number of sessions to return
 * @returns Array of timeline blocks for display
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
    .or('total_work_time.gte.60,total_break_time.gte.60')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error(
      'PomodoroService',
      'getRecentSessions',
      'Error fetching recent sessions',
      error
    );
    throw toError(error, 'Error fetching recent sessions');
  }

  return ((data || []) as TimelineBlockRow[]).map(mapRowToTimelineBlock);
}

/**
 * Get recent activity sessions for dashboard listing.
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
    .or('total_work_time.gte.60,total_break_time.gte.60')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error(
      'PomodoroService',
      'getRecentActivitySessions',
      'Error fetching recent activity sessions',
      error
    );
    throw toError(error, 'Error fetching recent activity sessions');
  }

  return ((data || []) as RecentSessionRow[]).map(mapRowToRecentSession);
}
