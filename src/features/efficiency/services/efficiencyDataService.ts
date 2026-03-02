import { supabase } from '@/lib/supabase';
import { calculateFocusPower } from '@/features/efficiency/logic/metricsCalc';
import { calculateEfficiencyScore } from '@/features/efficiency/logic/efficiencyHelpers';
import { getCycleCount } from '@/features/pomodoro/logic/sessionMath';
import {
  formatDisplayDate,
  getVirtualDateKey,
  getVirtualDayStart,
} from '@/utils/dateUtils';
import { isValid, parseOrThrow } from '@/utils/validation';
import { handleSupabaseError, safeQuery } from '@/lib/supabaseHelpers';
import { TimelineEventSchema } from '../types/efficiencyTypes';
import { generateDateRange } from '../logic/efficiencyHelpers';
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
 * Common helper to fetch pomodoro sessions with a dynamic history.
 */
async function fetchSessionHistory<T = Record<string, unknown>>(
  userId: string,
  select: string,
  errorContext: string,
  options: { months?: number; days?: number; startDate?: Date } = { months: 6 }
): Promise<T[]> {
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
}

// generateDateRange removed - using the one from efficiencyHelpers.ts

// === SECTION === Chart Data Functions

export interface LearningLoadParams {
  userId: string;
  days: number;
}

export async function getLearningLoadData({
  userId,
  days,
}: LearningLoadParams): Promise<LearningLoad[]> {
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

  const dailyMap = new Map<
    string,
    { pomodoro: number; video: number; reading: number }
  >();

  sessionsData?.forEach((s) => {
    const dateKey = getVirtualDateKey(new Date(s.started_at));
    const mins = Math.round((s.total_work_time || 0) / 60);
    const entry = dailyMap.get(dateKey) || {
      pomodoro: 0,
      video: 0,
      reading: 0,
    };
    entry.pomodoro += mins;
    dailyMap.set(dateKey, entry);
  });

  interface Video {
    duration_minutes: number | null;
    duration: string | null;
  }

  videoData.data?.forEach((v) => {
    if (!v.completed_at) return;
    const dateKey = getVirtualDateKey(new Date(v.completed_at));
    const video = v.video as Video;
    const duration = video?.duration_minutes || 0;
    const isReading = video?.duration?.includes('Sayfa');

    const entry = dailyMap.get(dateKey) || {
      pomodoro: 0,
      video: 0,
      reading: 0,
    };
    if (isReading) entry.reading += duration;
    else entry.video += duration;
    dailyMap.set(dateKey, entry);
  });

  const rawData: (LearningLoad & { rawDate: Date })[] = [];
  const anchorDate = getVirtualDayStart();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - i);
    d.setHours(12, 0, 0, 0);

    const dateKey = getVirtualDateKey(d);
    const dayName = i === 0 ? 'Bugün' : formatDisplayDate(d);
    const stats = dailyMap.get(dateKey) || {
      pomodoro: 0,
      video: 0,
      reading: 0,
    };

    rawData.push({
      day: dayName,
      videoMinutes: stats.video,
      readingMinutes: stats.reading,
      extraStudyMinutes: stats.pomodoro,
      rawDate: new Date(d),
    });
  }

  // Pre-calculate which weekend days have 0 minutes in the dataset
  const weekendNoActivityStrDates = new Set<string>();
  rawData.forEach((item) => {
    const d = item.rawDate;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const totalContent = item.videoMinutes + (item.readingMinutes || 0);
    const totalMins = item.extraStudyMinutes + totalContent;
    if (isWeekend && totalMins === 0) {
      weekendNoActivityStrDates.add(d.toISOString().split('T')[0]);
    }
  });

  // Filter out empty weekend days
  return rawData.filter((item) => {
    const d = item.rawDate;
    const dayOfWeek = d.getDay();
    const totalContent = item.videoMinutes + (item.readingMinutes || 0);
    const totalMins = item.extraStudyMinutes + totalContent;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (totalMins > 0) return true;
      const msInDay = 24 * 60 * 60 * 1000;
      let otherWeekendDayStr = '';
      if (dayOfWeek === 6) {
        const sundayDate = new Date(d.getTime() + msInDay);
        otherWeekendDayStr = sundayDate.toISOString().split('T')[0];
      } else if (dayOfWeek === 0) {
        const saturdayDate = new Date(d.getTime() - msInDay);
        otherWeekendDayStr = saturdayDate.toISOString().split('T')[0];
      }
      const otherDayAlsoZero =
        weekendNoActivityStrDates.has(otherWeekendDayStr);
      if (otherDayAlsoZero) {
        return dayOfWeek === 0;
      } else {
        return false;
      }
    }
    return true;
  });
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
    course_id: string | null;
  }>(
    userId,
    'started_at, total_work_time, total_break_time, total_pause_time, course_id',
    'getFocusPowerData error',
    { days: range === 'week' ? 7 : range === 'month' ? 30 : 180 }
  );

  // Get categories to identify academic courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id, category:categories(slug)');
  const academicCourseIds = new Set(
    (courses || [])
      .filter(
        (c) => (c.category as { slug: string } | null)?.slug === 'academic'
      )
      .map((c) => c.id)
  );

  const focusPowerAggMap = new Map<
    string,
    { work: number; breakTime: number; pause: number; academicWork: number }
  >();

  sessionsData?.forEach((s) => {
    const dateKey = getVirtualDateKey(new Date(s.started_at));
    const workSec = s.total_work_time || 0;
    const breakSec = s.total_break_time || 0;
    const pauseSec = s.total_pause_time || 0;
    const isAcademic =
      s.course_id === 'academic' ||
      (s.course_id && academicCourseIds.has(s.course_id));

    if (!focusPowerAggMap.has(dateKey)) {
      focusPowerAggMap.set(dateKey, {
        work: 0,
        breakTime: 0,
        pause: 0,
        academicWork: 0,
      });
    }
    const entry = focusPowerAggMap.get(dateKey)!;
    if (isAcademic) {
      entry.academicWork += workSec;
    } else {
      entry.work += workSec;
      entry.breakTime += breakSec;
      entry.pause += pauseSec;
    }
  });

  // Calculate points based on range
  const assembleData = (targetCount: number) => {
    const result: FocusPowerPoint[] = [];
    const loopCount = targetCount;

    const anchorDate = getVirtualDayStart();

    for (let i = loopCount - 1; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() - i);
      d.setHours(12, 0, 0, 0);
      const dateKey = getVirtualDateKey(d);

      const agg = focusPowerAggMap.get(dateKey) || {
        work: 0,
        breakTime: 0,
        pause: 0,
        academicWork: 0,
      };

      let score = 0;
      if (agg.work > 0) {
        // Average of non-academic work if it exists
        score = calculateFocusPower(agg.work, agg.breakTime, agg.pause);
      } else if (agg.academicWork > 0) {
        // Only academic work today -> 100
        score = 100;
      }

      const dayName = formatDisplayDate(d);

      // Filter out empty days if range is large, or keep all if range is small (week/month)
      // User requested filling gaps, so we default to fill, unless for 'all' time specialized logic
      result.push({
        date: dayName,
        originalDate: d.toISOString(),
        score: score,
        workMinutes: Math.round((agg.work + agg.academicWork) / 60),
        breakMinutes: Math.round(agg.breakTime / 60),
        pauseMinutes: Math.round(agg.pause / 60),
      });
    }
    return result;
  };

  const daysToAssemble = range === 'week' ? 7 : range === 'month' ? 30 : 180;
  const result = assembleData(daysToAssemble);

  // Pre-calculate which weekend days have 0 minutes in the dataset
  const weekendNoActivityStrDates = new Set<string>();
  result.forEach((item) => {
    const d = new Date(item.originalDate);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    if (isWeekend && item.workMinutes === 0) {
      weekendNoActivityStrDates.add(d.toISOString().split('T')[0]);
    }
  });

  // Filter out graduate study days (Tue, Wed, Thu) and empty weekend days
  return result.filter((item) => {
    const d = new Date(item.originalDate);
    const dayOfWeek = d.getDay();
    const hasActivity = item.workMinutes > 0;

    // Hafta sonu mantığı:
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (hasActivity) return true;

      const msInDay = 24 * 60 * 60 * 1000;
      let otherWeekendDayStr = '';
      if (dayOfWeek === 6) {
        const sundayDate = new Date(d.getTime() + msInDay);
        otherWeekendDayStr = sundayDate.toISOString().split('T')[0];
      } else if (dayOfWeek === 0) {
        const saturdayDate = new Date(d.getTime() - msInDay);
        otherWeekendDayStr = saturdayDate.toISOString().split('T')[0];
      }

      const otherDayAlsoZero =
        weekendNoActivityStrDates.has(otherWeekendDayStr);

      if (otherDayAlsoZero) {
        // İkisi de 0 ise, Pazar gününü tutarak disiplin cezasını gösterelim
        return dayOfWeek === 0;
      } else {
        // Sadece bu gün 0 ise, tatil hakkı uygulanır
        return false;
      }
    }

    return true;
  });
}

export async function getConsistencyData({
  userId,
  days = 30,
}: {
  userId: string;
  days?: number;
}): Promise<DayActivity[]> {
  const queryStartDate = new Date();
  queryStartDate.setDate(queryStartDate.getDate() - (days - 1));
  queryStartDate.setHours(0, 0, 0, 0);

  const [sessionsData] = await Promise.all([
    fetchSessionHistory<{
      started_at: string;
      total_work_time: number | null;
    }>(userId, 'started_at, total_work_time', 'getConsistencyData error', {
      days,
    }),
    supabase
      .from('video_progress')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', queryStartDate.toISOString()),
  ]);

  const dailyMap = new Map<string, number>();
  sessionsData?.forEach((s) => {
    const dateKey = getVirtualDateKey(new Date(s.started_at));
    const mins = Math.round((s.total_work_time || 0) / 60);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + mins);
  });

  /*
  videoData.data?.forEach((v) => {
    if (!v.completed_at) return;
    const dateKey = getVirtualDateKey(new Date(v.completed_at));
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1); // Content completion counts as activity
  });
  */

  const heatmap: DayActivity[] = [];
  const anchorDate = getVirtualDayStart();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - i);
    d.setHours(12, 0, 0, 0);

    const dateKey = getVirtualDateKey(d);
    const val = dailyMap.get(dateKey) || 0;

    heatmap.push({
      date: dateKey,
      totalMinutes: val,
      count: val > 0 ? 1 : 0,
      level: 0,
      intensity: 0,
    });
  }

  return heatmap;
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
    .filter((item) => {
      const d = new Date(item.date);
      const dayOfWeek = d.getDay();
      const hasActivity = item.minutes > 0;

      if (!hasActivity && (dayOfWeek === 0 || dayOfWeek === 6)) return false;

      return true;
    })
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

  const [sessions, coursesResponse, videoProgressResponse] = await Promise.all([
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
    supabase.from('courses').select('id, category:categories(slug)'),
    supabase
      .from('video_progress')
      .select('completed_at, video:videos(duration_minutes)')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', dateStr),
  ]);

  const coursesData = coursesResponse.data;
  const videoProgress = videoProgressResponse.data;

  const academicCourseIds = new Set(
    (coursesData || [])
      .filter(
        (c) => (c.category as { slug: string } | null)?.slug === 'academic'
      )
      .map((c) => c.id)
  );

  const dailyMap = new Map<
    string,
    { workSeconds: number; videoMinutes: number; academicMinutes: number }
  >();

  const dateRange = generateDateRange(daysToCheck);
  dateRange.forEach((date: string) =>
    dailyMap.set(date, { workSeconds: 0, videoMinutes: 0, academicMinutes: 0 })
  );

  sessions.forEach((s) => {
    const day = getVirtualDateKey(new Date(s.started_at));
    if (dailyMap.has(day)) {
      const entry = dailyMap.get(day)!;
      const isAcademic =
        s.course_id === 'academic' ||
        (s.course_id && academicCourseIds.has(s.course_id));
      if (isAcademic) {
        entry.academicMinutes += (s.total_work_time || 0) / 60;
      } else {
        entry.workSeconds += s.total_work_time || 0;
      }
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
      const workMinutes = stats.workSeconds / 60;
      const videoMinutes = stats.videoMinutes;
      const academicMinutes = stats.academicMinutes;

      // Academic minutes are treated as "ideal balance" (1.0 ratio)
      // We add them to work and also "virtually" to video to maintain the ratio if mixed
      const score = calculateEfficiencyScore(
        videoMinutes + academicMinutes,
        workMinutes + academicMinutes
      );

      return {
        date,
        score,
        workMinutes: Math.round(workMinutes + academicMinutes),
        videoMinutes: Math.round(videoMinutes),
      };
    })
    .filter((item) => {
      const d = new Date(item.date);
      const dayOfWeek = d.getDay();
      const hasActivity = item.workMinutes > 0 || item.videoMinutes > 0;

      if (!hasActivity && (dayOfWeek === 0 || dayOfWeek === 6)) return false;

      return true;
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
      'id, course_name, course_id, started_at, total_work_time, total_break_time, total_pause_time, pause_count, efficiency_score, timeline'
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

  // To exclude academic from average focus power
  const nonAcademicScores: number[] = [];
  const academicScores: number[] = [];

  const { data: courses } = await supabase
    .from('courses')
    .select('id, category:categories(slug)');

  const academicCourseIds = new Set(
    (courses || [])
      .filter(
        (c) => (c.category as { slug: string } | null)?.slug === 'academic'
      )
      .map((c) => c.id)
  );

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

    const isAcademic =
      s.course_id === 'academic' ||
      (s.course_id && academicCourseIds.has(s.course_id));
    if (eff > 0) {
      if (isAcademic) academicScores.push(eff);
      else nonAcademicScores.push(eff);
    }

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

  const dailyFocusPower =
    nonAcademicScores.length > 0
      ? Math.round(
          nonAcademicScores.reduce((acc, val) => acc + val, 0) /
            nonAcademicScores.length
        )
      : academicScores.length > 0
        ? 100
        : calculateFocusPower(totalWork, totalBreak, totalPause);

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
