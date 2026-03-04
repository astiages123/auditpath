import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import { calculateStreakMilestones } from '@/features/achievements/logic/streakLogic';
import type { StreakMilestones } from '@/features/achievements/types/achievementsTypes';

// ===========================
// === STREAK DATA READ ===
// ===========================

/**
 * Retrieves the historical streak milestones for a user,
 * factoring in the user's completed videos.
 *
 * @param userId - The UUID of the user
 * @returns A promise resolving to an object containing the max streak and first 7-day streak date
 */
export async function getStreakMilestones(
  userId: string
): Promise<StreakMilestones> {
  try {
    const { data } = await safeQuery<{ completed_at: string | null }[]>(
      supabase
        .from('video_progress')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .not('completed_at', 'is', null),
      'getStreakMilestones query error',
      { userId }
    );

    if (!data || data.length === 0) {
      return { maxStreak: 0, first7DayStreakDate: null };
    }

    // Collect unique active days by formatting date part
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
  } catch (error) {
    console.error('[streakService][getStreakMilestones] Error:', error);
    return { maxStreak: 0, first7DayStreakDate: null };
  }
}
