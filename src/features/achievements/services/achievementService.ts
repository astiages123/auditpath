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
/**
 * Birden fazla başarıyı toplu olarak kaydeder.
 */
export async function bulkUpsertAchievements(
  updates: Array<{
    user_id: string;
    achievement_id: string;
    unlocked_at: string;
    is_celebrated: boolean;
  }>
) {
  return safeQuery(
    supabase.from('user_achievements').upsert(updates, {
      onConflict: 'user_id,achievement_id',
      ignoreDuplicates: true,
    }),
    'Error upserting unlocked achievements'
  );
}

/**
 * Belirli başarıları kullanıcıdan geri alır (siler).
 */
export async function revokeAchievements(
  userId: string,
  achievementIds: string[]
) {
  return safeQuery(
    supabase
      .from('user_achievements')
      .delete()
      .eq('user_id', userId)
      .in('achievement_id', achievementIds),
    'Error revoking achievements'
  );
}

/**
 * Kutlanmamış başarıları getirir.
 */
export async function getUncelebratedAchievements(userId: string) {
  return safeQuery<{ achievement_id: string }[]>(
    supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)
      .eq('is_celebrated', false),
    'Error fetching uncelebrated achievements'
  );
}

/**
 * Bir başarıyı kutlandı olarak işaretler.
 */
export async function markAsCelebrated(userId: string, achievementId: string) {
  return safeQuery(
    supabase
      .from('user_achievements')
      .update({ is_celebrated: true })
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .eq('is_celebrated', false),
    'Error marking achievement as celebrated'
  );
}
