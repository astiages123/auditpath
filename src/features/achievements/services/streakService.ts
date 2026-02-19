import { supabase } from '@/lib/supabase';
import { calculateStreakMilestones } from '@/features/achievements/logic/streakLogic';
import type { StreakMilestones } from '@/features/achievements/types/achievementsTypes';

/**
 * Get streak milestones (max streak and first 7-day streak date).
 *
 * @param userId User ID
 * @returns Streak milestones
 */
export async function getStreakMilestones(
  userId: string
): Promise<StreakMilestones> {
  const { data, error } = await supabase
    .from('video_progress')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('completed', true)
    .not('completed_at', 'is', null);

  if (error || !data || data.length === 0) {
    return { maxStreak: 0, first7DayStreakDate: null };
  }

  // Collect unique active days
  const activeDaysSet = new Set<string>();
  for (const row of data) {
    if (!row.completed_at) continue;
    const date = new Date(row.completed_at);
    const dayKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    activeDaysSet.add(dayKey);
  }

  const activeDays = [...activeDaysSet].sort();

  if (activeDays.length === 0) {
    return { maxStreak: 0, first7DayStreakDate: null };
  }

  // Use utility function for streak calculation
  return calculateStreakMilestones(activeDays);
}
