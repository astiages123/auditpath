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

// ===========================
// === TYPE DEFINITIONS ===
// ===========================

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

// ===========================
// === SESSION CRUD SERVICES ===
// ===========================

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
  try {
    const parsedTimeline = parseTimelineEventsFromJson(session.timeline);
    const { totals, pauseCount, efficiencyScore } =
      calculateSessionMetrics(parsedTimeline);

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let finalCourseId: string | null = session.courseId;
    let finalCourseName = session.courseName;

    if (!uuidRegex.test(session.courseId)) {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, name')
        .eq('course_slug', session.courseId)
        .maybeSingle();

      if (courseError) {
        logger.error(
          'PomodoroService',
          'upsertPomodoroSession',
          'Error finding course by slug',
          courseError
        );
      }

      if (course) {
        finalCourseId = course.id;
        if (!finalCourseName) finalCourseName = course.name;
      } else {
        finalCourseId = null;
      }
    }

    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .upsert({
        id: session.id,
        user_id: userId,
        course_id: uuidRegex.test(finalCourseId || '') ? finalCourseId : null,
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
      console.error('[pomodoroService][upsertPomodoroSession] Hata:', error);
      logger.error(
        'PomodoroService',
        'upsertPomodoroSession',
        'Error upserting session',
        error
      );
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: unknown) {
    console.error('[pomodoroService][upsertPomodoroSession] Hata:', error);
    logger.error(
      'PomodoroService',
      'upsertPomodoroSession',
      'Unexpected error',
      error as Error
    );
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Get the latest active (not completed) session for a user.
 *
 * @param userId User ID
 * @returns Latest active session or null
 */
export async function getLatestActiveSession(userId: string) {
  try {
    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .select('*, course:courses(*, category:categories(*))')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .neq('is_completed', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[pomodoroService][getLatestActiveSession] Hata:', error);
      logger.error(
        'PomodoroService',
        'getLatestActiveSession',
        'Error fetching active session',
        error
      );
      return null;
    }

    return data;
  } catch (error: unknown) {
    console.error('[pomodoroService][getLatestActiveSession] Hata:', error);
    logger.error(
      'PomodoroService',
      'getLatestActiveSession',
      'Unexpected error',
      error as Error
    );
    return null;
  }
}

/**
 * Delete a pomodoro session.
 *
 * @param sessionId Session ID to delete
 */
export async function deletePomodoroSession(sessionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('pomodoro_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('[pomodoroService][deletePomodoroSession] Hata:', error);
      logger.error(
        'PomodoroService',
        'deletePomodoroSession',
        'Error deleting session',
        error
      );
    }
  } catch (error: unknown) {
    console.error('[pomodoroService][deletePomodoroSession] Hata:', error);
    logger.error(
      'PomodoroService',
      'deletePomodoroSession',
      'Unexpected error',
      error as Error
    );
  }
}

// ===========================
// === HEARTBEAT & SYNC SERVICES ===
// ===========================

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
  try {
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
      console.error('[pomodoroService][updatePomodoroHeartbeat] Hata:', error);
      logger.error(
        'PomodoroService',
        'updatePomodoroHeartbeat',
        'Heartbeat failed',
        error
      );
    }
  } catch (error: unknown) {
    console.error('[pomodoroService][updatePomodoroHeartbeat] Hata:', error);
    logger.error(
      'PomodoroService',
      'updatePomodoroHeartbeat',
      'Unexpected error',
      error as Error
    );
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
  try {
    fetch(`${supabaseUrl}/rest/v1/pomodoro_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((error: unknown) => {
      console.error('[pomodoroService][saveSessionBeacon] Hata:', error);
      logger.error(
        'PomodoroService',
        'saveSessionBeacon',
        'Beacon API request failed',
        error as Error
      );
    });
  } catch (error: unknown) {
    console.error('[pomodoroService][saveSessionBeacon] Hata:', error);
    logger.error(
      'PomodoroService',
      'saveSessionBeacon',
      'Beacon initialization failed',
      error as Error
    );
  }
}

/**
 * Save podomoro session to local storage as a fail-safe.
 *
 * @param payload Session data to save locally
 */
export function saveSessionToLocalQueue(payload: PomodoroBeaconPayload): void {
  try {
    const PENDING_KEY = 'pomodoro_pending_sessions';
    const existing = localStorage.getItem(PENDING_KEY);
    const sessions: PomodoroBeaconPayload[] = existing
      ? JSON.parse(existing)
      : [];

    // Avoid duplicates
    if (!sessions.some((s) => s.id === payload.id)) {
      sessions.push(payload);
      localStorage.setItem(PENDING_KEY, JSON.stringify(sessions));
      logger.info(
        'PomodoroService',
        'saveSessionToLocalQueue',
        'Session saved to local storage',
        { sessionId: payload.id }
      );
    }
  } catch (error) {
    logger.error(
      'PomodoroService',
      'saveSessionToLocalQueue',
      'Failed to save to local storage',
      error as Error
    );
  }
}

/**
 * Sync pending sessions from local storage to the database.
 *
 * @param userId User ID for ownership validation
 */
export async function syncPendingSessions(userId: string): Promise<void> {
  const PENDING_KEY = 'pomodoro_pending_sessions';
  try {
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

      const { error } = await upsertPomodoroSession(upsertParams, userId);

      if (!error) {
        successfulIds.push(session.id);
      }
    }

    if (successfulIds.length > 0) {
      const remaining = sessions.filter((s) => !successfulIds.includes(s.id));
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
  } catch (error) {
    logger.error(
      'PomodoroService',
      'syncPendingSessions',
      'Failed to sync pending sessions',
      error as Error
    );
  }
}

// ===========================
// === STATS & LIST SERVICES ===
// ===========================

/**
 * Get the count of pomodoro cycles completed today.
 * Uses the shared app day boundary (day starts at 00:00).
 *
 * @param userId User ID
 * @returns Number of cycles completed today
 */
export async function getDailySessionCount(userId: string): Promise<number> {
  try {
    const today = getAppDayStart();

    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .select('timeline')
      .eq('user_id', userId)
      .gte('started_at', today.toISOString());

    if (error) {
      console.error('[pomodoroService][getDailySessionCount] Hata:', error);
      logger.error(
        'PomodoroService',
        'getDailySessionCount',
        'Error counting sessions',
        error
      );
      return 0;
    }

    const totalCycles = (data || []).reduce((acc, s) => {
      const parsedTimeline = Array.isArray(s.timeline)
        ? parseTimelineEventsFromJson(s.timeline as Json[])
        : [];
      return acc + getCycleCount(parsedTimeline);
    }, 0);
    return totalCycles;
  } catch (error: unknown) {
    console.error('[pomodoroService][getDailySessionCount] Hata:', error);
    logger.error(
      'PomodoroService',
      'getDailySessionCount',
      'Unexpected error',
      error as Error
    );
    return 0;
  }
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
  try {
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
      console.error('[pomodoroService][getRecentSessions] Hata:', error);
      logger.error(
        'PomodoroService',
        'getRecentSessions',
        'Error fetching recent sessions',
        error || new Error('No data')
      );
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
    ).map(mapRowToTimelineBlock);
  } catch (error: unknown) {
    console.error('[pomodoroService][getRecentSessions] Hata:', error);
    logger.error(
      'PomodoroService',
      'getRecentSessions',
      'Unexpected error',
      error as Error
    );
    return [];
  }
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
  try {
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
      console.error(
        '[pomodoroService][getRecentActivitySessions] Hata:',
        error
      );
      logger.error(
        'PomodoroService',
        'getRecentActivitySessions',
        'Error fetching recent activity sessions',
        error
      );
      return [];
    }

    return (
      data as {
        id: string;
        course_name: string | null;
        started_at: string;
        total_work_time: number | null;
        total_break_time: number | null;
        total_pause_time: number | null;
        pause_count: number | null;
        efficiency_score: number | null;
        timeline: Json;
      }[]
    ).map(mapRowToRecentSession);
  } catch (error: unknown) {
    console.error('[pomodoroService][getRecentActivitySessions] Hata:', error);
    logger.error(
      'PomodoroService',
      'getRecentActivitySessions',
      'Unexpected error',
      error as Error
    );
    return [];
  }
}
