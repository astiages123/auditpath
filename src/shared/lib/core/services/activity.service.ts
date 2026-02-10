import { supabase } from '@/shared/lib/core/supabase';
import type { Database } from '@/shared/types/supabase';
import { getCycleCount } from '@/shared/lib/core/utils/efficiency-math';
import { getVirtualDateKey } from '@/shared/lib/utils/date-utils';
import type {
  CumulativeStats,
  DailyStats,
  DayActivity,
  HistoryStats,
} from '@/shared/types/efficiency';

/**
 * Get daily statistics with virtual day logic (day starts at 04:00).
 *
 * @param userId User ID
 * @returns Daily statistics
 */
export async function getDailyStats(userId: string): Promise<DailyStats> {
  const now = new Date();
  const today = new Date(now);

  // Virtual Day Logic: Day starts at 04:00 AM
  if (now.getHours() < 4) {
    today.setDate(today.getDate() - 1);
  }
  today.setHours(4, 0, 0, 0);

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
    console.error('Error fetching daily stats:', todayError);
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
 * Get last 30 days activity heatmap.
 *
 * @param userId User ID
 * @returns Array of daily activity data
 */
export async function getLast30DaysActivity(
  userId: string
): Promise<DayActivity[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('started_at, total_work_time')
    .eq('user_id', userId)
    .gte('started_at', thirtyDaysAgo.toISOString())
    .or('total_work_time.gte.60,total_break_time.gte.60');

  if (error) {
    console.error('Error fetching activity heatmap:', error);
    return [];
  }

  const dailyCounts: Record<string, { count: number; minutes: number }> = {};
  (data as Database['public']['Tables']['pomodoro_sessions']['Row'][])?.forEach(
    (s) => {
      const d = new Date(s.started_at);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(d.getDate()).padStart(2, '0')}`;
      dailyCounts[dateStr] = {
        count: (dailyCounts[dateStr]?.count || 0) + 1,
        minutes:
          (dailyCounts[dateStr]?.minutes || 0) + (s.total_work_time || 0),
      };
    }
  );

  const heatmap: DayActivity[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (30 - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
    const count = dailyCounts[dateStr]?.count || 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count >= 5) level = 4;
    else if (count >= 3) level = 3;
    else if (count >= 2) level = 2;
    else if (count >= 1) level = 1;

    heatmap.push({
      date: dateStr,
      count,
      level,
      intensity: level,
      totalMinutes: Math.round((dailyCounts[dateStr]?.minutes || 0) / 60),
    });
  }

  return heatmap;
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
    console.error(
      'Error fetching cumulative stats:',
      sessionError || videoError
    );
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
  const now = new Date();
  const today = new Date(now);
  if (now.getHours() < 4) {
    today.setDate(today.getDate() - 1);
  }
  today.setHours(4, 0, 0, 0);

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
    console.error('Error fetching history stats:', sessionError || videoError);
    return [];
  }

  // Group by Date
  const statsMap: Record<string, { pomodoro: number; video: number }> = {};

  // Initialize with 0s for all days
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
    statsMap[dateKey] = { pomodoro: 0, video: 0 };
  }

  (
    sessions as Database['public']['Tables']['pomodoro_sessions']['Row'][]
  )?.forEach((s) => {
    const d = new Date(s.started_at);
    if (d.getHours() < 4) d.setDate(d.getDate() - 1);

    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
    if (statsMap[dateKey]) {
      statsMap[dateKey].pomodoro += s.total_work_time || 0;
    }
  });

  videoProgress?.forEach((vp) => {
    if (!vp.completed_at) return;
    const d = new Date(vp.completed_at);
    if (d.getHours() < 4) d.setDate(d.getDate() - 1);

    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;

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
