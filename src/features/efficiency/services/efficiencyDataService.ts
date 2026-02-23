import { supabase } from '@/lib/supabase';
import { calculateFocusPower } from '@/features/efficiency/logic/metricsCalc';
import { getCycleCount } from '@/features/pomodoro/logic/sessionMath';
import {
  formatDisplayDate,
  getVirtualDateKey,
  getVirtualDayStart,
} from '@/utils/dateHelpers';
import { isValid, parseOrThrow } from '@/utils/validation';
import { handleSupabaseError, safeQuery } from '@/lib/supabaseHelpers';
import { TimelineEventSchema } from '../types/efficiencyTypes';
import { z } from 'zod';

import type {
  DailyEfficiencySummary,
  DayActivity,
  DetailedSession,
  EfficiencyTrend,
  FocusPowerPoint,
  FocusTrend,
  LearningLoad,
} from '@/features/efficiency/types/efficiencyTypes';

// ============== HELPER FUNCTIONS ==============

/**
 * Common helper to fetch pomodoro sessions with a 6-month history.
 */
async function fetchSessionHistory<T = Record<string, unknown>>(
  userId: string,
  select: string,
  errorContext: string,
  options: { months?: number; days?: number } = { months: 6 }
): Promise<T[]> {
  const queryStartDate = new Date();
  if (options.days) {
    queryStartDate.setDate(queryStartDate.getDate() - options.days);
  } else {
    queryStartDate.setMonth(queryStartDate.getMonth() - (options.months || 6));
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
}

/**
 * Generates an array of date strings for the last N days.
 */
function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(getVirtualDateKey(d));
  }
  return dates;
}

// === SECTION === Chart Data Functions

export interface LearningLoadParams {
  userId: string;
  days: number;
}

export async function getLearningLoadData({
  userId,
  days,
}: LearningLoadParams): Promise<LearningLoad[]> {
  const sessionsData = await fetchSessionHistory<{
    started_at: string;
    total_work_time: number | null;
  }>(userId, 'started_at, total_work_time', 'getLearningLoadData error');

  const dailyMap = new Map<string, number>();

  sessionsData?.forEach((s) => {
    const dateKey = getVirtualDateKey(new Date(s.started_at));
    const mins = Math.round((s.total_work_time || 0) / 60);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + mins);
  });

  // Decide how many days to return.
  // If 'days' is small (like 7 or 30), we strictly conform to that range.
  // The 'days' param implies "Last N days".

  const rawData: (LearningLoad & { rawDate: Date })[] = [];

  // Create range for requested days
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0); // Noon to avoid timezone shifts
    d.setDate(d.getDate() - i);

    const dateKey = getVirtualDateKey(d);
    const dayName = i === 0 ? 'Bugün' : formatDisplayDate(d);

    rawData.push({
      day: dayName,
      videoMinutes: 0,
      extraStudyMinutes: Math.round(dailyMap.get(dateKey) || 0),
      rawDate: new Date(d),
    });
  }

  // If showing many days (like 180), we might filter empty weekends to reduce noise
  if (days > 30) {
    return rawData.filter((item) => {
      const d = item.rawDate;
      const dayOfWeek = d.getDay(); // 0 is Sunday
      const totalMins = item.extraStudyMinutes;
      // Skip empty weekends
      if (totalMins === 0 && (dayOfWeek === 0 || dayOfWeek === 6)) {
        return false;
      }
      return true;
    });
  }

  return rawData;
}

export async function getFocusPowerData({
  userId,
  range,
}: {
  userId: string;
  range: 'week' | 'month' | 'all';
}): Promise<FocusPowerPoint[]> {
  const queryStartDate = new Date();
  queryStartDate.setMonth(queryStartDate.getMonth() - 6);

  const sessionsData = await fetchSessionHistory<{
    started_at: string;
    total_work_time: number | null;
    total_break_time: number | null;
    total_pause_time: number | null;
  }>(
    userId,
    'started_at, total_work_time, total_break_time, total_pause_time',
    'getFocusPowerData error'
  );

  const focusPowerAggMap = new Map<
    string,
    { work: number; breakTime: number; pause: number }
  >();

  sessionsData?.forEach((s) => {
    const dateKey = getVirtualDateKey(new Date(s.started_at));
    const workSec = s.total_work_time || 0;
    const breakSec = s.total_break_time || 0;
    const pauseSec = s.total_pause_time || 0;

    if (!focusPowerAggMap.has(dateKey)) {
      focusPowerAggMap.set(dateKey, { work: 0, breakTime: 0, pause: 0 });
    }
    const entry = focusPowerAggMap.get(dateKey)!;
    entry.work += workSec;
    entry.breakTime += breakSec;
    entry.pause += pauseSec;
  });

  // Calculate points based on range
  const assembleData = (targetCount: number) => {
    const result: FocusPowerPoint[] = [];
    const loopCount = targetCount;

    for (let i = loopCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dateKey = getVirtualDateKey(d);

      const agg = focusPowerAggMap.get(dateKey) || {
        work: 0,
        breakTime: 0,
        pause: 0,
      };
      const score = calculateFocusPower(agg.work, agg.breakTime, agg.pause);

      const dayName = formatDisplayDate(d);

      // Filter out empty days if range is large, or keep all if range is small (week/month)
      // User requested filling gaps, so we default to fill, unless for 'all' time specialized logic
      result.push({
        date: dayName,
        originalDate: d.toISOString(),
        score: score,
        workMinutes: Math.round(agg.work / 60),
        breakMinutes: Math.round(agg.breakTime / 60),
        pauseMinutes: Math.round(agg.pause / 60),
      });
    }
    return result;
  };

  if (range === 'week') return assembleData(7);
  if (range === 'month') return assembleData(30);

  // For "all" time, we aggregate by month
  const allTimeFocus: FocusPowerPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1); // First day of the month

    let mWork = 0,
      mBreak = 0,
      mPause = 0;

    // Iterate map to sum up for this month
    for (const [key, val] of focusPowerAggMap.entries()) {
      const keyDate = new Date(key);
      if (
        keyDate.getMonth() === d.getMonth() &&
        keyDate.getFullYear() === d.getFullYear()
      ) {
        mWork += val.work;
        mBreak += val.breakTime;
        mPause += val.pause;
      }
    }

    const score = calculateFocusPower(mWork, mBreak, mPause);
    const monthName = formatDisplayDate(d, { month: 'long' });

    allTimeFocus.push({
      date: monthName,
      originalDate: d.toISOString(),
      score: score,
      workMinutes: Math.round(mWork / 60),
      breakMinutes: Math.round(mBreak / 60),
      pauseMinutes: Math.round(mPause / 60),
    });
  }

  return allTimeFocus;
}

export async function getConsistencyData({
  userId,
  days = 30,
}: {
  userId: string;
  days?: number;
}): Promise<DayActivity[]> {
  const queryStartDate = new Date();
  queryStartDate.setMonth(queryStartDate.getMonth() - 6);

  const sessionsData = await fetchSessionHistory<{
    started_at: string;
    total_work_time: number | null;
  }>(userId, 'started_at, total_work_time', 'getConsistencyData error');

  const dailyMap = new Map<string, number>();

  sessionsData?.forEach((s) => {
    const dateKey = getVirtualDateKey(new Date(s.started_at));
    const mins = Math.round((s.total_work_time || 0) / 60);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + mins);
  });

  const rawHeatmap: DayActivity[] = [];
  // Generate slightly more than needed to detect streaks/breaks at edges if needed
  const loopDays = days + 14;

  for (let i = loopDays; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(12, 0, 0, 0);

    const dateKey = getVirtualDateKey(d);
    const mins = dailyMap.get(dateKey) || 0;

    rawHeatmap.push({
      date: dateKey,
      totalMinutes: mins,
      count: mins > 0 ? 1 : 0,
      level: 0,
      intensity: 0,
    });
  }

  // Filter Logic: "Empty days" on weekends might be ignored if adjacent days have work (Optional logic from original code preserved)
  const filteredHeatmap = rawHeatmap.filter((day, idx, arr) => {
    const [y, m, dt] = day.date.split('-').map(Number);
    const d = new Date(y, m - 1, dt);
    const dayOfWeek = d.getDay();
    const mins = day.totalMinutes || 0;

    if (mins === 0) {
      if (dayOfWeek === 6) {
        // Saturday
        const nextDay = arr[idx + 1];
        if (nextDay && (nextDay.totalMinutes || 0) > 0) return false;
      }
      if (dayOfWeek === 0) {
        // Sunday
        const prevDay = arr[idx - 1];
        if (prevDay && (prevDay.totalMinutes || 0) > 0) return false;
      }
    }
    return true;
  });

  return filteredHeatmap.slice(-days).map((item) => ({
    ...item,
    level: 0,
    intensity: 0,
  }));
}

// === SECTION === Trend Functions

/**
 * Get focus trend (work time) over the last 30 days.
 *
 * @param userId User ID
 * @returns Array of focus trend data
 */
export async function getFocusTrend(userId: string): Promise<FocusTrend[]> {
  const daysToCheck = 30;
  const data = await fetchSessionHistory<{
    started_at: string;
    total_work_time: number | null;
  }>(userId, 'started_at, total_work_time', 'getFocusTrend error', {
    days: daysToCheck,
  });

  const dailyMap = new Map<string, number>();
  const dateRange = generateDateRange(daysToCheck);
  dateRange.forEach((date: string) => dailyMap.set(date, 0));

  data.forEach((s) => {
    const day = getVirtualDateKey(new Date(s.started_at));
    if (dailyMap.has(day)) {
      dailyMap.set(day, (dailyMap.get(day) || 0) + (s.total_work_time || 0));
    }
  });

  return Array.from(dailyMap.entries())
    .map(([date, seconds]) => ({
      date,
      minutes: Math.round(seconds / 60),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get efficiency trend over the last 30 days.
 */
export async function getEfficiencyTrend(
  userId: string
): Promise<EfficiencyTrend[]> {
  const daysToCheck = 30;
  const queryStartDate = new Date();
  queryStartDate.setDate(queryStartDate.getDate() - daysToCheck);
  const dateStr = queryStartDate.toISOString();

  const [sessions, { data: videoProgress }] = await Promise.all([
    fetchSessionHistory<{
      started_at: string;
      total_work_time: number | null;
    }>(
      userId,
      'started_at, total_work_time',
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

  const dailyMap = new Map<
    string,
    { workSeconds: number; videoMinutes: number }
  >();

  const dateRange = generateDateRange(daysToCheck);
  dateRange.forEach((date: string) =>
    dailyMap.set(date, { workSeconds: 0, videoMinutes: 0 })
  );

  sessions.forEach((s) => {
    const day = getVirtualDateKey(new Date(s.started_at));
    if (dailyMap.has(day)) {
      const entry = dailyMap.get(day)!;
      entry.workSeconds += s.total_work_time || 0;
    }
  });

  videoProgress?.forEach((vp) => {
    if (!vp.completed_at) return;
    const day = getVirtualDateKey(new Date(vp.completed_at));

    const videoData = vp.video;
    const videoObj = Array.isArray(videoData) ? videoData[0] : videoData;

    const durationSchema = z
      .object({
        duration_minutes: z.number().nullable(),
      })
      .nullable();

    const parsed = durationSchema.safeParse(videoObj);
    const duration = parsed.success ? (parsed.data?.duration_minutes ?? 0) : 0;

    if (dailyMap.has(day)) {
      const entry = dailyMap.get(day)!;
      entry.videoMinutes += duration;
    }
  });

  return Array.from(dailyMap.entries())
    .map(([date, stats]) => {
      const workSeconds = stats.workSeconds;
      const videoMinutes = stats.videoMinutes;
      const workMinutes = workSeconds / 60;

      let multiplier = 0;
      if (workSeconds > 0) {
        multiplier = videoMinutes / workMinutes;
      }

      return {
        date,
        score: Number(multiplier.toFixed(2)),
        workMinutes: Math.round(workMinutes),
        videoMinutes: Math.round(videoMinutes),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// === SECTION === Summary Functions

/**
 * Get daily efficiency summary for the master card.
 *
 * @param userId User ID
 * @returns Daily efficiency summary
 */
export async function getDailyEfficiencySummary(
  userId: string
): Promise<DailyEfficiencySummary> {
  const today = getVirtualDayStart();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: todaySessions, error } = await supabase
    .from('pomodoro_sessions')
    .select(
      'id, course_name, started_at, total_work_time, total_break_time, total_pause_time, pause_count, efficiency_score, timeline'
    )
    .eq('user_id', userId)
    .gte('started_at', today.toISOString())
    .lt('started_at', tomorrow.toISOString())
    .or('total_work_time.gte.60,total_break_time.gte.60')
    .order('started_at', { ascending: true });

  if (error) {
    await handleSupabaseError(error, 'getDailyEfficiencySummary');
  }

  const sessionsData = todaySessions || [];

  let totalWork = 0;
  let totalBreak = 0;
  let totalPause = 0;
  let totalPauseCount = 0;
  let totalCycles = 0;

  const detailedSessions: DetailedSession[] = sessionsData.map((s) => {
    const work = s.total_work_time || 0;
    const brk = s.total_break_time || 0;
    const pause = s.total_pause_time || 0;
    const eff = s.efficiency_score || 0;
    const pCount = s.pause_count || 0;

    totalWork += work;
    totalBreak += brk;
    totalPause += pause;
    totalPauseCount += pCount;
    totalCycles += getCycleCount(s.timeline);

    // Validate timeline structure
    const rawTimeline = s.timeline;
    let validatedTimeline: z.infer<typeof TimelineEventSchema>[] = [];

    if (Array.isArray(rawTimeline)) {
      // We map and validate each item, skipping invalid ones to prevent crash
      validatedTimeline = rawTimeline
        .map((item) => {
          if (isValid(TimelineEventSchema, item)) {
            return parseOrThrow(TimelineEventSchema, item);
          }
          return null;
        })
        .filter((t): t is z.infer<typeof TimelineEventSchema> => t !== null);
    }

    return {
      id: s.id,
      courseName: s.course_name || 'Bilinmeyen Ders',
      workTimeSeconds: work,
      breakTimeSeconds: brk,
      pauseTimeSeconds: pause,
      efficiencyScore: eff,
      timeline: validatedTimeline,
      startedAt: s.started_at,
    };
  });

  const dailyFocusPower = calculateFocusPower(
    totalWork,
    totalBreak,
    totalPause
  );

  return {
    efficiencyScore: dailyFocusPower,
    totalCycles,
    netWorkTimeSeconds: totalWork,
    totalBreakTimeSeconds: totalBreak,
    totalPauseTimeSeconds: totalPause,
    pauseCount: totalPauseCount,
    sessions: detailedSessions,
  };
}
