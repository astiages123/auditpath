import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import type { UnlockedAchievement } from '@/features/achievements/types/achievementsTypes';
import { safeQuery } from '@/lib/supabaseHelpers';

/**
 * Get all unlocked achievements for a user.
 *
 * @param userId User ID
 * @returns Array of unlocked achievements
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

  return (data || []).map((a) => ({
    id: a.achievement_id,
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
  // Check if achievement is already unlocked
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
    // Already unlocked, do nothing
    return;
  }

  // achievedAt verilmişse onu kullan, yoksa şu anki zamanı kullan
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
