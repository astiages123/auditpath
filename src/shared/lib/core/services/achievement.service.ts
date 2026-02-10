import { supabase } from '@/shared/lib/core/supabase';
import type { Database } from '@/shared/types/supabase';
import type { UnlockedAchievement } from '@/shared/types/efficiency';

/**
 * Get all unlocked achievements for a user.
 *
 * @param userId User ID
 * @returns Array of unlocked achievements
 */
export async function getUnlockedAchievements(
  userId: string
): Promise<UnlockedAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    const isAbort =
      error.message?.includes('AbortError') || error.code === 'ABORT_ERROR';
    if (!isAbort) {
      // Log to tracking service
    }
    return [];
  }

  return (
    data as Database['public']['Tables']['user_achievements']['Row'][]
  ).map((a) => ({
    achievement_id: a.achievement_id,
    unlockedAt: a.unlocked_at,
  }));
}

/**
 * Unlock an achievement for a user.
 *
 * @param userId User ID
 * @param achievementId Achievement ID to unlock
 * @param achievedAt Optional: Actual achievement date (ISO string or YYYY-MM-DD)
 */
export async function unlockAchievement(
  userId: string,
  achievementId: string,
  achievedAt?: string
) {
  // achievedAt verilmişse onu kullan, yoksa şu anki zamanı kullan
  const unlockDate = achievedAt
    ? new Date(achievedAt).toISOString()
    : new Date().toISOString();

  const { error } = await supabase.from('user_achievements').upsert({
    user_id: userId,
    achievement_id: achievementId,
    unlocked_at: unlockDate,
    is_celebrated: false,
  });

  if (error) console.error('Error unlocking achievement:', error);
}
