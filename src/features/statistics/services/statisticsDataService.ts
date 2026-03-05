import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { getVirtualDayStart } from '@/utils/dateUtils';
import { handleSupabaseError, safeQuery } from '@/lib/supabaseHelpers';
import { generateDateRange } from '../logic/statisticsHelpers';
import { performanceMonitor } from '@/utils/performance';
import {
  processConsistencyData,
  processDailyEfficiencySummary,
  processEfficiencyTrend,
  processFocusPowerData,
  processFocusTrend,
  processLearningLoadData,
} from './statisticsCoreService';

import type {
  DailyEfficiencySummary,
  DayActivity,
  EfficiencyTrend,
  FocusPowerPoint,
  FocusTrend,
  LearningLoad,
  RawSession,
  RawVideo,
} from '@/features/statistics/types/statisticsTypes';

const rawVideoSchema = z.object({
  completed_at: z.string().nullable().optional(),
  video: z.unknown(),
});

const rawVideoArraySchema = z.array(rawVideoSchema);

// ==========================================
// === DB FETCH HELPERS ===
// ==========================================

/**
 * Common helper to fetch pomodoro sessions with a dynamic history.
 */
async function fetchSessionHistory<T = Record<string, unknown>>(
  userId: string,
  select: string,
  errorContext: string,
  options: { months?: number; days?: number; startDate?: Date } = { months: 6 }
): Promise<T[]> {
  try {
    let queryStartDate: Date;

    if (options.startDate) {
      queryStartDate = options.startDate;
    } else {
      queryStartDate = new Date();
      if (options.days) {
        queryStartDate.setDate(queryStartDate.getDate() - options.days);
      } else {
        queryStartDate.setMonth(
          queryStartDate.getMonth() - (options.months || 6)
        );
      }
    }

    const queryStartDateStr = queryStartDate.toISOString();

    const response = await supabase
      .from('pomodoro_sessions')
      .select(select)
      .eq('user_id', userId)
      .gte('started_at', queryStartDateStr);

    const { data } = await safeQuery<T[]>(
      Promise.resolve({
        data: response.data as T[] | null,
        error: response.error,
        count: response.count,
      }),
      errorContext,
      { userId }
    );
    return data || [];
  } catch (error) {
    console.error('[EfficiencyDataService][fetchSessionHistory] Hata:', error);
    return [];
  }
}

// ==========================================
// === CHART FETCH FUNCTIONS ===
// ==========================================

export interface LearningLoadParams {
  userId: string;
  days: number;
}

/**
 * Fetch learning load data for charting.
 */
export async function getLearningLoadData({
  userId,
  days,
}: LearningLoadParams): Promise<LearningLoad[]> {
  try {
    const queryStartDate = new Date();
    queryStartDate.setDate(queryStartDate.getDate() - (days - 1));
    queryStartDate.setHours(0, 0, 0, 0);

    const [sessionsData, videoData] = await Promise.all([
      fetchSessionHistory<{
        started_at: string;
        total_work_time: number | null;
      }>(userId, 'started_at, total_work_time', 'getLearningLoadData error', {
        days,
      }),
      supabase
        .from('video_progress')
        .select('completed_at, video:videos(duration_minutes, duration)')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', queryStartDate.toISOString()),
    ]);

    return processLearningLoadData(
      sessionsData || [],
      videoData.data || [],
      days,
      getVirtualDayStart()
    );
  } catch (error) {
    console.error('[EfficiencyDataService][getLearningLoadData] Hata:', error);
    return [];
  }
}

/**
 * Fetch comprehensive raw data for all charts (Consolidated optimization).
 */
export async function getComprehensiveHistory(
  userId: string,
  days: number = 180
): Promise<{ sessions: RawSession[]; videos: RawVideo[] }> {
  try {
    const queryStartDate = new Date();
    queryStartDate.setDate(queryStartDate.getDate() - (days - 1));
    queryStartDate.setHours(0, 0, 0, 0);

    const [sessions, videos] = await performanceMonitor.measurePromise(
      'EfficiencyDataService',
      'getComprehensiveHistory',
      () =>
        Promise.all([
          fetchSessionHistory<RawSession>(
            userId,
            'started_at, total_work_time, total_break_time, total_pause_time, course_id, id, pause_count, efficiency_score, timeline',
            'getComprehensiveHistory sessions error',
            { days }
          ),
          supabase
            .from('video_progress')
            .select('completed_at, video:videos(duration_minutes, duration)')
            .eq('user_id', userId)
            .eq('completed', true)
            .gte('completed_at', queryStartDate.toISOString()),
        ])
    );
    const parsedVideos = rawVideoArraySchema.safeParse(videos.data);

    return {
      sessions: sessions || [],
      videos: parsedVideos.success ? parsedVideos.data : [],
    };
  } catch (error) {
    console.error(
      '[EfficiencyDataService][getComprehensiveHistory] Hata:',
      error
    );
    return { sessions: [], videos: [] };
  }
}

/**
 * Fetch focus power trend data.
 */
export async function getFocusPowerData({
  userId,
  range,
}: {
  userId: string;
  range: 'week' | 'month' | 'all';
}): Promise<FocusPowerPoint[]> {
  try {
    const daysToAssemble = range === 'week' ? 7 : range === 'month' ? 30 : 180;

    // Explicit return for unused queryStartDate error (if exists based on legacy)
    // The history fetched below covers it properly with "days"

    const sessionsData = await fetchSessionHistory<{
      started_at: string;
      total_work_time: number | null;
      total_break_time: number | null;
      total_pause_time: number | null;
      course_id: string | null;
    }>(
      userId,
      'started_at, total_work_time, total_break_time, total_pause_time, course_id',
      'getFocusPowerData error',
      { days: daysToAssemble }
    );

    return processFocusPowerData(
      sessionsData || [],
      range,
      getVirtualDayStart()
    );
  } catch (error) {
    console.error('[EfficiencyDataService][getFocusPowerData] Hata:', error);
    return [];
  }
}

/**
 * Fetch consistently map data.
 */
export async function getConsistencyData({
  userId,
  days = 30,
}: {
  userId: string;
  days?: number;
}): Promise<DayActivity[]> {
  try {
    const [sessionsData] = await Promise.all([
      fetchSessionHistory<{
        started_at: string;
        total_work_time: number | null;
      }>(userId, 'started_at, total_work_time', 'getConsistencyData error', {
        days,
      }),
    ]);

    return processConsistencyData(
      sessionsData || [],
      days,
      getVirtualDayStart()
    );
  } catch (error) {
    console.error('[EfficiencyDataService][getConsistencyData] Hata:', error);
    return [];
  }
}

// ==========================================
// === TREND FETCH FUNCTIONS ===
// ==========================================

/**
 * Fetch focus trend.
 */
export async function getFocusTrend(userId: string): Promise<FocusTrend[]> {
  try {
    const daysToCheck = 30;
    const data = await fetchSessionHistory<{
      started_at: string;
      total_work_time: number | null;
    }>(userId, 'started_at, total_work_time', 'getFocusTrend error', {
      days: daysToCheck,
    });

    const dateRange = generateDateRange(daysToCheck);
    return processFocusTrend(data || [], dateRange);
  } catch (error) {
    console.error('[EfficiencyDataService][getFocusTrend] Hata:', error);
    return [];
  }
}

/**
 * Fetch efficiency trend.
 */
export async function getEfficiencyTrend(
  userId: string
): Promise<EfficiencyTrend[]> {
  try {
    const daysToCheck = 30;
    const queryStartDate = new Date();
    queryStartDate.setDate(queryStartDate.getDate() - daysToCheck);
    const dateStr = queryStartDate.toISOString();

    const [sessionsData, videoProgressResponse] = await Promise.all([
      fetchSessionHistory<{
        started_at: string;
        total_work_time: number | null;
        course_id: string | null;
      }>(
        userId,
        'started_at, total_work_time, course_id',
        'getEfficiencyTrend sessions error',
        { days: daysToCheck }
      ),
      supabase
        .from('video_progress')
        .select('completed_at, video:videos(duration_minutes)')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', dateStr),
    ]);

    const dateRange = generateDateRange(daysToCheck);
    return processEfficiencyTrend(
      sessionsData || [],
      videoProgressResponse.data || [],
      dateRange
    );
  } catch (error) {
    console.error('[EfficiencyDataService][getEfficiencyTrend] Hata:', error);
    return [];
  }
}

// ==========================================
// === SUMMARY FETCH FUNCTIONS ===
// ==========================================

/**
 * Fetch the detailed daily summary data.
 */
export async function getDailyEfficiencySummary(
  userId: string
): Promise<DailyEfficiencySummary> {
  try {
    const today = getVirtualDayStart();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todaySessions, error } =
      await performanceMonitor.measurePromise(
        'EfficiencyDataService',
        'getDailyEfficiencySummary',
        async () => {
          const response = await supabase
            .from('pomodoro_sessions')
            .select(
              'id, course_name, course_id, started_at, total_work_time, total_break_time, total_pause_time, pause_count, efficiency_score, timeline'
            )
            .eq('user_id', userId)
            .gte('started_at', today.toISOString())
            .lt('started_at', tomorrow.toISOString())
            .or('total_work_time.gte.60,total_break_time.gte.60')
            .order('started_at', { ascending: true });
          return response;
        }
      );

    if (error) {
      await handleSupabaseError(error, 'getDailyEfficiencySummary');
      throw error;
    }

    return processDailyEfficiencySummary(todaySessions || []);
  } catch (error) {
    console.error(
      '[EfficiencyDataService][getDailyEfficiencySummary] Hata:',
      error
    );
    // Return empty fallback
    return {
      efficiencyScore: 0,
      totalCycles: 0,
      netWorkTimeSeconds: 0,
      totalBreakTimeSeconds: 0,
      totalPauseTimeSeconds: 0,
      pauseCount: 0,
      sessions: [],
    };
  }
}
