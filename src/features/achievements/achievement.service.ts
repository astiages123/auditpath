import { supabase } from '@/services/supabase';
import type { Database } from '@/types/database.types';
import type { UnlockedAchievement } from '@/types';
import { logger } from '@/utils/logger';

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
  // Check if achievement is already unlocked
  const { data: existing, error: checkError } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .maybeSingle();

  if (checkError) {
    logger.error('Error checking achievement existence:', checkError);
    return;
  }

  if (existing) {
    // Already unlocked, do nothing
    return;
  }

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

  if (error) logger.error('Error unlocking achievement:', error);
}
