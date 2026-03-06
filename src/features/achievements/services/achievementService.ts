import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import type { UnlockedAchievement } from '@/features/achievements/types/achievementsTypes';
import { safeQuery } from '@/lib/supabaseHelpers';

/**
 * Retrieves all unlocked achievements for a specific user.
 *
 * @param userId - The UUID of the user
 * @returns A promise resolving to an array of unlocked achievements
 */
export async function getUnlockedAchievements(
  userId: string
): Promise<UnlockedAchievement[]> {
  const { data } = await safeQuery<
    Database['public']['Tables']['user_achievements']['Row'][]
  >(
    supabase.from('user_achievements').select('*').eq('user_id', userId),
    'getUnlockedAchievements error',
    { userId }
  );

  return (data || []).map((achievement) => ({
    id: achievement.achievement_id,
    unlockedAt: achievement.unlocked_at,
  }));
}

/**
 * Unlocks an achievement for a user if it hasn't been unlocked already.
 *
 * @param userId - The UUID of the user
 * @param achievementId - The ID of the achievement to unlock
 * @param achievedAt - Optional actual achievement date (ISO string or YYYY-MM-DD); defaults to now
 * @returns A promise resolving when the operation completes
 */
export async function unlockAchievement(
  userId: string,
  achievementId: string,
  achievedAt?: string
): Promise<void> {
  const { data: existing } = await safeQuery(
    supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .maybeSingle(),
    'unlockAchievement check error',
    { userId, achievementId }
  );

  if (existing) {
    return;
  }

  const unlockDate = achievedAt
    ? new Date(achievedAt).toISOString()
    : new Date().toISOString();

  await safeQuery(
    supabase.from('user_achievements').upsert({
      user_id: userId,
      achievement_id: achievementId,
      unlocked_at: unlockDate,
      is_celebrated: false,
    }),
    'unlockAchievement upsert error',
    { userId, achievementId }
  );
}
