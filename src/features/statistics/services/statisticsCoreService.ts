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

type TrendDayAggregate = {
  workSeconds: number;
  breakSeconds: number;
  pauseSeconds: number;
  videoMinutes: number;
  readingMinutes: number;
  contentMinutes: number;
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

const getEmptyTrendAggregate = (): TrendDayAggregate => ({
  workSeconds: 0,
  breakSeconds: 0,
  pauseSeconds: 0,
  videoMinutes: 0,
  readingMinutes: 0,
  contentMinutes: 0,
});

const getOrCreateTrendAggregate = (
  aggregates: Map<string, TrendDayAggregate>,
  dateKey: string
): TrendDayAggregate => {
  const existing = aggregates.get(dateKey);
  if (existing) {
    return existing;
  }

  const created = getEmptyTrendAggregate();
  aggregates.set(dateKey, created);
  return created;
};

const getWeekendPairVisibility = <
  T extends { rawDate: Date; totalMinutes: number },
>(
  items: T[]
) => {
  const weekendNoActivityStrDates = new Set<string>();

  items.forEach((item) => {
    const isWeekend =
      item.rawDate.getDay() === 0 || item.rawDate.getDay() === 6;

    if (isWeekend && item.totalMinutes === 0) {
      weekendNoActivityStrDates.add(item.rawDate.toISOString().split('T')[0]);
    }
  });

  return { weekendNoActivityStrDates };
};

const shouldKeepWeekendEntry = (
  date: Date,
  totalMinutes: number,
  weekendNoActivityStrDates: Set<string>
) => {
  const dayOfWeek = date.getDay();

  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
    return true;
  }

  if (totalMinutes > 0) {
    return true;
  }

  const msInDay = 24 * 60 * 60 * 1000;
  const otherWeekendDayStr =
    dayOfWeek === 6
      ? new Date(date.getTime() + msInDay).toISOString().split('T')[0]
      : new Date(date.getTime() - msInDay).toISOString().split('T')[0];

  const otherDayAlsoZero = weekendNoActivityStrDates.has(otherWeekendDayStr);
  return otherDayAlsoZero ? dayOfWeek === 0 : false;
};

export function buildTrendDayAggregates(
  sessionsData: RawSession[],
  videoData: RawVideo[]
): Map<string, TrendDayAggregate> {
  const aggregates = new Map<string, TrendDayAggregate>();

  sessionsData.forEach((session) => {
    const dateKey = getVirtualDateKey(new Date(session.started_at));
    const entry = getOrCreateTrendAggregate(aggregates, dateKey);

    entry.workSeconds += session.total_work_time || 0;
    entry.breakSeconds += session.total_break_time || 0;
    entry.pauseSeconds += session.total_pause_time || 0;
  });

  videoData.forEach((videoProgress) => {
    if (!videoProgress.completed_at) {
      return;
    }

    const dateKey = getVirtualDateKey(new Date(videoProgress.completed_at));
    const entry = getOrCreateTrendAggregate(aggregates, dateKey);
    const video = videoProgress.video as {
      duration_minutes?: number | null;
      duration?: string | null;
    } | null;
    const duration = video?.duration_minutes || 0;
    const isReading = video?.duration?.includes('Sayfa');

    entry.contentMinutes += duration;

    if (isReading) {
      entry.readingMinutes += duration;
    } else {
      entry.videoMinutes += duration;
    }
  });

  return aggregates;
}

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
    return processLearningLoadDataFromAggregates(
      buildTrendDayAggregates(sessionsData, videoData),
      days,
      anchorDate
    );
  } catch (error) {
    console.error(
      '[EfficiencyCoreService][processLearningLoadData] Hata:',
      error
    );
    throw error;
  }
}

export function processLearningLoadDataFromAggregates(
  aggregates: Map<string, TrendDayAggregate>,
  days: number,
  anchorDate: Date
): LearningLoad[] {
  try {
    const rawData: Array<
      LearningLoad & { rawDate: Date; totalMinutes: number }
    > = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() - i);
      d.setHours(12, 0, 0, 0);

      const dateKey = getVirtualDateKey(d);
      const dayName = i === 0 ? 'Bugün' : formatDisplayDate(d);
      const stats = aggregates.get(dateKey) || getEmptyTrendAggregate();
      const pomodoroMinutes = Math.round(stats.workSeconds / 60);
      const totalMinutes =
        pomodoroMinutes + stats.videoMinutes + stats.readingMinutes;

      rawData.push({
        day: dayName,
        videoMinutes: stats.videoMinutes,
        readingMinutes: stats.readingMinutes,
        extraStudyMinutes: pomodoroMinutes,
        rawDate: new Date(d),
        totalMinutes,
      });
    }

    const { weekendNoActivityStrDates } = getWeekendPairVisibility(rawData);

    return rawData.filter((item) => {
      return shouldKeepWeekendEntry(
        item.rawDate,
        item.totalMinutes,
        weekendNoActivityStrDates
      );
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
    return processFocusPowerDataFromAggregates(
      buildTrendDayAggregates(sessionsData, []),
      range,
      anchorDate
    );
  } catch (error) {
    console.error(
      '[EfficiencyCoreService][processFocusPowerData] Hata:',
      error
    );
    throw error;
  }
}

export function processFocusPowerDataFromAggregates(
  aggregates: Map<string, TrendDayAggregate>,
  range: 'week' | 'month' | 'all',
  anchorDate: Date
): FocusPowerPoint[] {
  try {
    const daysToAssemble = range === 'week' ? 7 : range === 'month' ? 30 : 180;
    const result: Array<
      FocusPowerPoint & { rawDate: Date; totalMinutes: number }
    > = [];

    for (let i = daysToAssemble - 1; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() - i);
      d.setHours(12, 0, 0, 0);

      const dateKey = getVirtualDateKey(d);
      const agg = aggregates.get(dateKey) || getEmptyTrendAggregate();

      result.push({
        date: formatDisplayDate(d),
        originalDate: d.toISOString(),
        score:
          agg.workSeconds > 0
            ? calculateFocusPower(
                agg.workSeconds,
                agg.breakSeconds,
                agg.pauseSeconds
              )
            : 0,
        workMinutes: Math.round(agg.workSeconds / 60),
        breakMinutes: Math.round(agg.breakSeconds / 60),
        pauseMinutes: Math.round(agg.pauseSeconds / 60),
        rawDate: new Date(d),
        totalMinutes: Math.round(agg.workSeconds / 60),
      });
    }

    const { weekendNoActivityStrDates } = getWeekendPairVisibility(result);

    return result.filter((item) =>
      shouldKeepWeekendEntry(
        item.rawDate,
        item.totalMinutes,
        weekendNoActivityStrDates
      )
    );
  } catch (error) {
    console.error(
      '[EfficiencyCoreService][processFocusPowerDataFromAggregates] Hata:',
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
    return processConsistencyDataFromAggregates(
      buildTrendDayAggregates(sessionsData, []),
      days,
      anchorDate
    );
  } catch (error) {
    console.error(
      '[EfficiencyCoreService][processConsistencyData] Hata:',
      error
    );
    throw error;
  }
}

export function processConsistencyDataFromAggregates(
  aggregates: Map<string, TrendDayAggregate>,
  days: number,
  anchorDate: Date
): DayActivity[] {
  try {
    const heatmap: DayActivity[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() - i);
      d.setHours(12, 0, 0, 0);

      const dateKey = getVirtualDateKey(d);
      const val = Math.round((aggregates.get(dateKey)?.workSeconds || 0) / 60);

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
      '[EfficiencyCoreService][processConsistencyDataFromAggregates] Hata:',
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
    return processFocusTrendFromAggregates(
      buildTrendDayAggregates(sessionsData, []),
      dateRange
    );
  } catch (error) {
    console.error('[EfficiencyCoreService][processFocusTrend] Hata:', error);
    throw error;
  }
}

export function processFocusTrendFromAggregates(
  aggregates: Map<string, TrendDayAggregate>,
  dateRange: string[]
): FocusTrend[] {
  try {
    return dateRange
      .map((date) => ({
        date,
        minutes: Math.round((aggregates.get(date)?.workSeconds || 0) / 60),
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
    console.error(
      '[EfficiencyCoreService][processFocusTrendFromAggregates] Hata:',
      error
    );
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
    return processEfficiencyTrendFromAggregates(
      buildTrendDayAggregates(sessionsData, videoProgress),
      dateRange
    );
  } catch (error) {
    console.error(
      '[EfficiencyCoreService][processEfficiencyTrend] Hata:',
      error
    );
    throw error;
  }
}

export function processEfficiencyTrendFromAggregates(
  aggregates: Map<string, TrendDayAggregate>,
  dateRange: string[]
): EfficiencyTrend[] {
  try {
    return dateRange
      .map((date) => {
        const stats = aggregates.get(date) || getEmptyTrendAggregate();
        const workMinutes = stats.workSeconds / 60;
        const videoMinutes = stats.contentMinutes;

        return {
          date,
          score: calculateEfficiencyScore(videoMinutes, workMinutes),
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
      '[EfficiencyCoreService][processEfficiencyTrendFromAggregates] Hata:',
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
