import { getCycleCount } from '@/features/pomodoro/logic/sessionMath';
import { calculateEfficiencyScore } from '../logic/statisticsHelpers';
import { calculateFocusPower } from '../logic/metricsCalc';
import { formatDisplayDate, getVirtualDateKey } from '@/utils/dateUtils';
import { isValid, parseOrThrow } from '@/utils/validation';
import { EFFICIENCY_CONFIG } from '../utils/constants';
import { TimelineEventSchema } from '../types/statisticsTypes';
import { z } from 'zod';
import type { TimelineEvent } from '@/features/pomodoro/logic/sessionMath';
import type {
  DailyEfficiencySummary,
  DailyStats,
  DayActivity,
  DetailedSession,
  EfficiencyTrend,
  FocusPowerPoint,
  FocusTrend,
  LearningLoad,
  RawSession,
  RawVideo,
} from '@/features/statistics/types/statisticsTypes';

/**
 * Lightweight video payload used for trend comparison.
 */
export type RawVideoSimple = {
  video_id: string | null;
};

const parseTimelineEvents = (timeline: unknown): TimelineEvent[] => {
  if (!Array.isArray(timeline)) return [];

  return timeline
    .map((timelineItem: unknown) => {
      if (isValid(TimelineEventSchema, timelineItem)) {
        return parseOrThrow(TimelineEventSchema, timelineItem);
      }
      return null;
    })
    .filter(
      (timelineItem): timelineItem is TimelineEvent => timelineItem !== null
    );
};

// ==========================================
// === PROCESSING FUNCTIONS ===
// ==========================================

/**
 * Calculates raw daily statistics from fetched database rows.
 *
 * @param todaySessions Raw session data for today
 * @param yesterdaySessions Raw session data for yesterday
 * @param todayVideos Raw video data for today
 * @param yesterdayVideos Raw video data for yesterday
 * @returns Fully constructed DailyStats object
 */
export function processDailyStats(
  todaySessions: RawSession[],
  yesterdaySessions: RawSession[],
  todayVideos: RawVideo[],
  yesterdayVideos: RawVideoSimple[]
): DailyStats {
  try {
    const totalWorkSeconds =
      todaySessions.reduce((acc, s) => acc + (s.total_work_time || 0), 0) || 0;
    const totalBreakSeconds =
      todaySessions.reduce((acc, s) => acc + (s.total_break_time || 0), 0) || 0;
    const totalPauseSeconds =
      todaySessions.reduce((acc, s) => acc + (s.total_pause_time || 0), 0) || 0;

    const totalCycles = todaySessions.reduce(
      (acc, s) => acc + getCycleCount(parseTimelineEvents(s.timeline)),
      0
    );

    const totalWorkMinutes = Math.round(totalWorkSeconds / 60);
    const totalBreakMinutes = Math.round(totalBreakSeconds / 60);
    const totalPauseMinutes = Math.round(totalPauseSeconds / 60);

    const yesterdayWorkSeconds =
      yesterdaySessions.reduce((acc, s) => acc + (s.total_work_time || 0), 0) ||
      0;
    const yesterdayWorkMinutes = Math.round(yesterdayWorkSeconds / 60);

    let trendPercentage = 0;
    if (yesterdayWorkMinutes === 0) {
      trendPercentage = totalWorkMinutes > 0 ? 100 : 0;
    } else {
      trendPercentage = Math.round(
        ((totalWorkMinutes - yesterdayWorkMinutes) / yesterdayWorkMinutes) * 100
      );
    }

    const totalVideoMinutesData = todayVideos.reduce(
      (acc, vp) => {
        const video = vp.video as {
          duration_minutes?: number | null;
          duration?: string | null;
        } | null;
        const duration = video?.duration_minutes || 0;
        const isReading = video?.duration?.includes('Sayfa');
        return {
          minutes: acc.minutes + (isReading ? 0 : duration),
          readingMinutes: acc.readingMinutes + (isReading ? duration : 0),
          pages: acc.pages + (isReading ? parseInt(video?.duration || '0') : 0),
        };
      },
      { minutes: 0, readingMinutes: 0, pages: 0 }
    );

    const completedVideosCount = todayVideos.length || 0;
    const yesterdayVideoCount = yesterdayVideos.length || 0;

    let videoTrendPercentage = 0;
    if (yesterdayVideoCount === 0) {
      videoTrendPercentage = completedVideosCount > 0 ? 100 : 0;
    } else {
      videoTrendPercentage = Math.round(
        ((completedVideosCount - yesterdayVideoCount) / yesterdayVideoCount) *
          100
      );
    }

    const goalMinutes = EFFICIENCY_CONFIG.DAILY_GOAL_MINUTES;
    const progress = Math.min(
      100,
      Math.round((totalWorkMinutes / goalMinutes) * 100)
    );

    return {
      totalWorkMinutes,
      totalBreakMinutes,
      sessionCount: totalCycles,
      goalMinutes,
      progress,
      goalPercentage: progress,
      trendPercentage,
      dailyGoal: goalMinutes,
      totalPauseMinutes,
      totalVideoMinutes: Math.round(totalVideoMinutesData.minutes),
      totalReadingMinutes: Math.round(totalVideoMinutesData.readingMinutes),
      pagesRead: totalVideoMinutesData.pages,
      completedVideos: completedVideosCount,
      videoTrendPercentage,
      totalCycles,
    };
  } catch (error) {
    console.error('[EfficiencyCoreService][processDailyStats] Hata:', error);
    throw error;
  }
}

/**
 * Transforms raw database sessions and videos into learning load blocks for charting.
 */
export function processLearningLoadData(
  sessionsData: RawSession[],
  videoData: RawVideo[],
  days: number,
  anchorDate: Date
): LearningLoad[] {
  try {
    const dailyMap = new Map<
      string,
      { pomodoro: number; video: number; reading: number }
    >();

    sessionsData.forEach((s) => {
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

    videoData.forEach((v) => {
      if (!v.completed_at) return;
      const dateKey = getVirtualDateKey(new Date(v.completed_at));
      const video = v.video as {
        duration_minutes?: number | null;
        duration?: string | null;
      };
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
  } catch (error) {
    console.error(
      '[EfficiencyCoreService][processLearningLoadData] Hata:',
      error
    );
    throw error;
  }
}

/**
 * Transforms raw session data into Focus Power trend data.
 */
export function processFocusPowerData(
  sessionsData: RawSession[],
  range: 'week' | 'month' | 'all',
  anchorDate: Date
): FocusPowerPoint[] {
  try {
    const focusPowerAggMap = new Map<
      string,
      { work: number; breakTime: number; pause: number }
    >();

    sessionsData.forEach((s) => {
      const dateKey = getVirtualDateKey(new Date(s.started_at));
      const workSec = s.total_work_time || 0;
      const breakSec = s.total_break_time || 0;
      const pauseSec = s.total_pause_time || 0;

      if (!focusPowerAggMap.has(dateKey)) {
        focusPowerAggMap.set(dateKey, {
          work: 0,
          breakTime: 0,
          pause: 0,
        });
      }
      const entry = focusPowerAggMap.get(dateKey)!;
      entry.work += workSec;
      entry.breakTime += breakSec;
      entry.pause += pauseSec;
    });

    const assembleData = (targetCount: number) => {
      const result: FocusPowerPoint[] = [];

      for (let i = targetCount - 1; i >= 0; i--) {
        const d = new Date(anchorDate);
        d.setDate(d.getDate() - i);
        d.setHours(12, 0, 0, 0);
        const dateKey = getVirtualDateKey(d);

        const agg = focusPowerAggMap.get(dateKey) || {
          work: 0,
          breakTime: 0,
          pause: 0,
        };

        let score = 0;
        if (agg.work > 0) {
          score = calculateFocusPower(agg.work, agg.breakTime, agg.pause);
        }

        const dayName = formatDisplayDate(d);

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

    const daysToAssemble = range === 'week' ? 7 : range === 'month' ? 30 : 180;
    const result = assembleData(daysToAssemble);

    const weekendNoActivityStrDates = new Set<string>();
    result.forEach((item) => {
      const d = new Date(item.originalDate);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (isWeekend && item.workMinutes === 0) {
        weekendNoActivityStrDates.add(d.toISOString().split('T')[0]);
      }
    });

    return result.filter((item) => {
      const d = new Date(item.originalDate);
      const dayOfWeek = d.getDay();
      const hasActivity = item.workMinutes > 0;

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
          return dayOfWeek === 0;
        } else {
          return false;
        }
      }

      return true;
    });
  } catch (error) {
    console.error(
      '[EfficiencyCoreService][processFocusPowerData] Hata:',
      error
    );
    throw error;
  }
}

/**
 * Transforms raw sessions into consistency heatmap data.
 */
export function processConsistencyData(
  sessionsData: RawSession[],
  days: number,
  anchorDate: Date
): DayActivity[] {
  try {
    const dailyMap = new Map<string, number>();
    sessionsData.forEach((s) => {
      const dateKey = getVirtualDateKey(new Date(s.started_at));
      const mins = Math.round((s.total_work_time || 0) / 60);
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + mins);
    });

    const heatmap: DayActivity[] = [];
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
  } catch (error) {
    console.error(
      '[EfficiencyCoreService][processConsistencyData] Hata:',
      error
    );
    throw error;
  }
}

/**
 * Transforms raw sessions into focus trend data.
 */
export function processFocusTrend(
  sessionsData: RawSession[],
  dateRange: string[]
): FocusTrend[] {
  try {
    const dailyMap = new Map<string, number>();
    dateRange.forEach((date: string) => dailyMap.set(date, 0));

    sessionsData.forEach((s) => {
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
  } catch (error) {
    console.error('[EfficiencyCoreService][processFocusTrend] Hata:', error);
    throw error;
  }
}

/**
 * Transforms raw sessions and video progress into efficiency trend data.
 */
export function processEfficiencyTrend(
  sessionsData: RawSession[],
  videoProgress: RawVideo[],
  dateRange: string[]
): EfficiencyTrend[] {
  try {
    const dailyMap = new Map<
      string,
      { workSeconds: number; videoMinutes: number }
    >();

    dateRange.forEach((date: string) =>
      dailyMap.set(date, { workSeconds: 0, videoMinutes: 0 })
    );

    sessionsData.forEach((s) => {
      const day = getVirtualDateKey(new Date(s.started_at));
      if (dailyMap.has(day)) {
        const entry = dailyMap.get(day)!;
        entry.workSeconds += s.total_work_time || 0;
      }
    });

    videoProgress.forEach((vp) => {
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
      const duration = parsed.success
        ? (parsed.data?.duration_minutes ?? 0)
        : 0;

      if (dailyMap.has(day)) {
        const entry = dailyMap.get(day)!;
        entry.videoMinutes += duration;
      }
    });

    return Array.from(dailyMap.entries())
      .map(([date, stats]) => {
        const workMinutes = stats.workSeconds / 60;
        const videoMinutes = stats.videoMinutes;

        const score = calculateEfficiencyScore(videoMinutes, workMinutes);

        return {
          date,
          score,
          workMinutes: Math.round(workMinutes),
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
  } catch (error) {
    console.error(
      '[EfficiencyCoreService][processEfficiencyTrend] Hata:',
      error
    );
    throw error;
  }
}

/**
 * Compiles a detailed daily summary of sessions.
 */
export function processDailyEfficiencySummary(
  sessionsData: RawSession[]
): DailyEfficiencySummary {
  try {
    let totalWork = 0;
    let totalBreak = 0;
    let totalPause = 0;
    let totalPauseCount = 0;
    let totalCycles = 0;

    const scores: number[] = [];

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
      totalCycles += getCycleCount(parseTimelineEvents(s.timeline));

      if (eff > 0) {
        scores.push(eff);
      }

      const rawTimeline = s.timeline;
      let validatedTimeline: z.infer<typeof TimelineEventSchema>[] = [];

      if (Array.isArray(rawTimeline)) {
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
        id: s.id || '',
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
      scores.length > 0
        ? Math.round(scores.reduce((acc, val) => acc + val, 0) / scores.length)
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
  } catch (error) {
    console.error(
      '[EfficiencyCoreService][processDailyEfficiencySummary] Hata:',
      error
    );
    throw error;
  }
}
