import { supabase } from '@/lib/supabase';
import { getCycleCount } from '@/features/pomodoro/logic/sessionMath';
import type {
  CumulativeStats,
  DailyStats,
  HistoryStats,
} from '@/features/efficiency/types/efficiencyTypes';
import { logger } from '@/utils/logger';
import {
  adjustToVirtualDay,
  formatDateKey,
  getVirtualToday,
} from './activityUtils';

/**
 * Get daily statistics with virtual day logic (day starts at 04:00).
 *
 * @param userId User ID
 * @returns Daily statistics
 */
export async function getDailyStats(userId: string): Promise<DailyStats> {
  const today = getVirtualToday();

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Fetch Today's Pomodoro Stats
  const { data: todaySessions, error: todayError } = await supabase
    .from('pomodoro_sessions')
    .select('total_work_time, total_break_time, total_pause_time, timeline')
    .eq('user_id', userId)
    .gte('started_at', today.toISOString())
    .lt('started_at', tomorrow.toISOString())
    .or('total_work_time.gte.60,total_break_time.gte.60');

  if (todayError) {
    logger.error('Error fetching daily stats:', todayError);
  }

  // 2. Fetch Yesterday's Pomodoro Stats (for Trend)
  const { data: yesterdaySessions } = await supabase
    .from('pomodoro_sessions')
    .select('total_work_time')
    .eq('user_id', userId)
    .gte('started_at', yesterday.toISOString())
    .lt('started_at', today.toISOString());

  // 3. Fetch Video Stats (Today & Yesterday)
  const { data: todayVideos } = await supabase
    .from('video_progress')
    .select('video_id, video:videos(duration_minutes)')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', today.toISOString())
    .lt('completed_at', tomorrow.toISOString());

  const { data: yesterdayVideos } = await supabase
    .from('video_progress')
    .select('video_id')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', yesterday.toISOString())
    .lt('completed_at', today.toISOString());

  // DB stores Seconds. UI expects Minutes.
  const todaySessionsData = todaySessions || [];
  const totalWorkSeconds =
    todaySessionsData.reduce((acc, s) => acc + (s.total_work_time || 0), 0) ||
    0;
  const totalBreakSeconds =
    todaySessionsData.reduce((acc, s) => acc + (s.total_break_time || 0), 0) ||
    0;
  const totalPauseSeconds =
    todaySessionsData.reduce((acc, s) => acc + (s.total_pause_time || 0), 0) ||
    0;

  // Calculate total cycles
  const totalCycles = todaySessionsData.reduce(
    (acc, s) => acc + getCycleCount(s.timeline),
    0
  );

  const totalWorkMinutes = Math.round(totalWorkSeconds / 60);
  const totalBreakMinutes = Math.round(totalBreakSeconds / 60);
  const totalPauseMinutes = Math.round(totalPauseSeconds / 60);

  const sessionCount = totalCycles;

  const yesterdayWorkSeconds =
    yesterdaySessions?.reduce((acc, s) => acc + (s.total_work_time || 0), 0) ||
    0;
  const yesterdayWorkMinutes = Math.round(yesterdayWorkSeconds / 60);

  // Calculate Trend
  let trendPercentage = 0;
  if (yesterdayWorkMinutes === 0) {
    trendPercentage = totalWorkMinutes > 0 ? 100 : 0;
  } else {
    trendPercentage = Math.round(
      ((totalWorkMinutes - yesterdayWorkMinutes) / yesterdayWorkMinutes) * 100
    );
  }

  // Calculate Video Stats
  let totalVideoMinutes = 0;
  const completedVideosCount = todayVideos?.length || 0;

  if (todayVideos) {
    totalVideoMinutes = todayVideos.reduce((acc, vp) => {
      const duration =
        (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
      return acc + duration;
    }, 0);
  }

  const yesterdayVideoCount = yesterdayVideos?.length || 0;
  let videoTrendPercentage = 0;
  if (yesterdayVideoCount === 0) {
    videoTrendPercentage = completedVideosCount > 0 ? 100 : 0;
  } else {
    videoTrendPercentage = Math.round(
      ((completedVideosCount - yesterdayVideoCount) / yesterdayVideoCount) * 100
    );
  }

  const goalMinutes = 200;
  const progress = Math.min(
    100,
    Math.round((totalWorkMinutes / goalMinutes) * 100)
  );

  return {
    totalWorkMinutes,
    totalBreakMinutes,
    sessionCount,
    goalMinutes,
    progress,
    goalPercentage: progress,
    trendPercentage,
    dailyGoal: goalMinutes,
    totalPauseMinutes,
    totalVideoMinutes: Math.round(totalVideoMinutes),
    completedVideos: completedVideosCount,
    videoTrendPercentage,
    totalCycles,
  };
}

/**
 * Get cumulative statistics (all-time).
 *
 * @param userId User ID
 * @returns Cumulative statistics
 */
export async function getCumulativeStats(
  userId: string
): Promise<CumulativeStats> {
  // 1. Total Pomodoro
  const { data: allSessions, error: sessionError } = await supabase
    .from('pomodoro_sessions')
    .select('total_work_time')
    .eq('user_id', userId);

  // 2. Total Video
  const { data: allVideos, error: videoError } = await supabase
    .from('video_progress')
    .select('video_id, video:videos(duration_minutes)')
    .eq('user_id', userId)
    .eq('completed', true);

  if (sessionError || videoError) {
    logger.error('Error fetching cumulative stats:', {
      sessionError: sessionError?.message,
      videoError: videoError?.message,
    });
  }

  const totalWorkSeconds =
    allSessions?.reduce((acc, s) => acc + (s.total_work_time || 0), 0) || 0;
  const totalWorkMinutes = Math.round(totalWorkSeconds / 60);

  let totalVideoMinutes = 0;
  if (allVideos) {
    totalVideoMinutes = allVideos.reduce((acc, vp) => {
      const duration =
        (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
      return acc + duration;
    }, 0);
  }

  const ratio =
    totalVideoMinutes > 0
      ? Math.round((totalWorkMinutes / totalVideoMinutes) * 10) / 10
      : 0;

  return {
    totalWorkMinutes,
    totalVideoMinutes: Math.round(totalVideoMinutes),
    ratio,
  };
}

/**
 * Get historical statistics for the last N days.
 *
 * @param userId User ID
 * @param days Number of days to fetch (default: 7)
 * @returns Array of daily history stats
 */
export async function getHistoryStats(
  userId: string,
  days: number = 7
): Promise<HistoryStats[]> {
  const today = getVirtualToday();

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(4, 0, 0, 0);

  // 1. Fetch Pomodoro Sessions
  const { data: sessions, error: sessionError } = await supabase
    .from('pomodoro_sessions')
    .select('started_at, total_work_time')
    .eq('user_id', userId)
    .gte('started_at', startDate.toISOString())
    .or('total_work_time.gte.60,total_break_time.gte.60');

  // 2. Fetch Video Progress
  const { data: videoProgress, error: videoError } = await supabase
    .from('video_progress')
    .select('completed_at, video_id, video:videos(duration_minutes)')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', startDate.toISOString());

  if (sessionError || videoError) {
    logger.error('Error fetching history stats:', {
      sessionError: sessionError?.message,
      videoError: videoError?.message,
    });
    return [];
  }

  // Group by Date
  const statsMap: Record<string, { pomodoro: number; video: number }> = {};

  // Initialize with 0s for all days
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateKey = formatDateKey(d);
    statsMap[dateKey] = { pomodoro: 0, video: 0 };
  }

  (sessions || []).forEach((s) => {
    const d = adjustToVirtualDay(new Date(s.started_at));
    const dateKey = formatDateKey(d);
    if (statsMap[dateKey]) {
      statsMap[dateKey].pomodoro += s.total_work_time || 0;
    }
  });

  videoProgress?.forEach((vp) => {
    if (!vp.completed_at) return;
    const d = adjustToVirtualDay(new Date(vp.completed_at));
    const dateKey = formatDateKey(d);

    if (statsMap[dateKey]) {
      const duration =
        (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
      statsMap[dateKey].video += duration;
    }
  });

  return Object.entries(statsMap)
    .map(([date, values]) => ({
      date,
      pomodoro: Math.round(values.pomodoro / 60),
      video: Math.round(values.video),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
