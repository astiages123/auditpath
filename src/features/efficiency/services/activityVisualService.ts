import { supabase } from '@/lib/supabase';
import type { DayActivity } from '@/features/efficiency/types/efficiencyTypes';
import { logger } from '@/utils/logger';
import { formatDateKey } from './activityUtils';

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

  if (error || !data) {
    if (error) logger.error('Error fetching activity heatmap:', error);
    return [];
  }

  const dailyCounts: Record<string, { count: number; minutes: number }> = {};
  data.forEach((s) => {
    const d = new Date(s.started_at);
    const dateStr = formatDateKey(d);
    dailyCounts[dateStr] = {
      count: (dailyCounts[dateStr]?.count || 0) + 1,
      minutes: (dailyCounts[dateStr]?.minutes || 0) + (s.total_work_time || 0),
    };
  });

  const heatmap: DayActivity[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (30 - i));
    const dateStr = formatDateKey(d);
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
