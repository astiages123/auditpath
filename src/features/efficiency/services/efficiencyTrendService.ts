import { supabase } from '@/lib/supabase';
import { getVirtualDateKey, getVirtualDayStart } from '@/utils/dateHelpers';
import type {
  EfficiencyTrend,
  FocusTrend,
} from '@/features/efficiency/types/efficiencyTypes';
import { generateDateRange } from '../logic/efficiencyHelpers';

/**
 * Get focus trend (work time) over the last 30 days.
 *
 * @param userId User ID
 * @returns Array of focus trend data
 */
export async function getFocusTrend(userId: string): Promise<FocusTrend[]> {
  const daysToCheck = 30;
  const thirtyDaysAgo = getVirtualDayStart();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - daysToCheck);
  const dateStr = thirtyDaysAgo.toISOString();

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('started_at, total_work_time')
    .eq('user_id', userId)
    .gte('started_at', dateStr);

  if (error || !data) return [];

  // O(N) Aggregation
  const dailyMap = new Map<string, number>();

  // Pre-fill dates to ensure no gaps (User Request: fill gaps)
  const dateRange = generateDateRange(daysToCheck);
  dateRange.forEach((date: string) => dailyMap.set(date, 0));

  data.forEach((s) => {
    const day = getVirtualDateKey(new Date(s.started_at));
    // Verify day is within range before adding (it should be due to query, but safe check)
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
 *
 * @param userId User ID
 * @returns Array of efficiency trend data
 */
export async function getEfficiencyTrend(
  userId: string
): Promise<EfficiencyTrend[]> {
  const daysToCheck = 30;
  const thirtyDaysAgo = getVirtualDayStart();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - daysToCheck);
  const dateStr = thirtyDaysAgo.toISOString();

  const [{ data: sessions }, { data: videoProgress }] = await Promise.all([
    supabase
      .from('pomodoro_sessions')
      .select('started_at, total_work_time')
      .eq('user_id', userId)
      .gte('started_at', dateStr),
    supabase
      .from('video_progress')
      .select('completed_at, video:videos(duration_minutes)')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', dateStr),
  ]);

  // Map for O(1) access
  const dailyMap = new Map<
    string,
    { workSeconds: number; videoMinutes: number }
  >();

  // Fill gaps
  const dateRange = generateDateRange(daysToCheck);
  dateRange.forEach((date: string) =>
    dailyMap.set(date, { workSeconds: 0, videoMinutes: 0 })
  );

  sessions?.forEach((s) => {
    const day = getVirtualDateKey(new Date(s.started_at));
    if (dailyMap.has(day)) {
      const entry = dailyMap.get(day)!;
      entry.workSeconds += s.total_work_time || 0;
    }
  });

  videoProgress?.forEach((vp) => {
    if (!vp.completed_at) return;
    const day = getVirtualDateKey(new Date(vp.completed_at));

    // Handle array or single object for joined video data
    const video = (Array.isArray(vp.video) ? vp.video[0] : vp.video) as {
      duration_minutes?: number;
    } | null;
    const duration = video?.duration_minutes || 0;

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
