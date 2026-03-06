import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import { getDailyVideoMilestones } from '@/features/courses/services/videoService';
import { getTotalActiveDays } from '@/features/achievements/services/userStatsService';
import { getUnlockedAchievements } from '@/features/achievements/services/achievementService';
import { ACHIEVEMENTS, calculateAchievements } from '../logic/achievementsData';
import { type ProgressStats } from '../types/achievementsTypes';
import { RANKS } from '../utils/constants';
import type { Rank } from '@/types/auth';
import { logger } from '@/utils/logger';
import { getCategories } from '@/features/courses/services/courseService';

export const achievementKeys = {
  all: ['achievements'] as const,
  uncelebrated: (userId: string) =>
    [...achievementKeys.all, 'uncelebrated', userId] as const,
};

interface SyncContext {
  stats: ProgressStats;
  userId: string;
  queryClient: ReturnType<typeof useQueryClient>;
}

/**
 * Internal logic to synchronize unlocked achievements based on user activity and stats.
 */
async function syncAchievements({ stats, userId, queryClient }: SyncContext) {
  if (!userId || !stats) return;

  try {
    const categories = await getCategories();

    // Gather specific milestone metrics
    const totalActiveDays = await getTotalActiveDays(userId);
    const dailyMilestones = await getDailyVideoMilestones(userId);
    const activityLog = {
      totalActiveDays,
      dailyVideosCompleted: dailyMilestones.maxCount,
    };

    // Fetch previously unlocked achievements
    const dbUnlocked = await getUnlockedAchievements(userId);
    const dbIds = new Set<string>(
      dbUnlocked.map((achievement) => achievement.id)
    );

    // Calculate currently eligible achievements
    const eligibleIds = new Set<string>();

    // Step 1: Algorithmic standard achievements
    const algorithmicIds = calculateAchievements(stats, activityLog);
    algorithmicIds.forEach((id) => eligibleIds.add(id));

    // Step 2: Ranks
    const currentRankId = stats.currentRank?.id;
    const currentRankOrder =
      (RANKS as Rank[]).find((rank: Rank) => rank.id === currentRankId)
        ?.order ?? -1;

    if (currentRankOrder >= 0) {
      (RANKS as Rank[]).forEach((rank: Rank) => {
        if (rank.order <= currentRankOrder) {
          if (rank.id === '1') return;
          eligibleIds.add(`RANK_UP:${rank.id}`);
        }
      });
    }

    categories.forEach((category) => {
      const categorySlug = category.slug;
      const categoryStats =
        stats.categoryProgress[categorySlug] ||
        stats.categoryProgress[categorySlug.toLowerCase()];

      if (
        categoryStats &&
        categoryStats.completedVideos >= categoryStats.totalVideos &&
        categoryStats.totalVideos > 0
      ) {
        eligibleIds.add(`CATEGORY_COMPLETION:${categorySlug}`);
      }
    });

    const toUnlock = [...eligibleIds].filter((id) => !dbIds.has(id));

    if (toUnlock.length > 0) {
      const updates = toUnlock.map((id) => {
        let unlockDate = new Date().toISOString();

        if (id === 'special-01' && dailyMilestones.first5Date) {
          unlockDate = new Date(dailyMilestones.first5Date).toISOString();
        }
        if (id === 'special-02' && dailyMilestones.first10Date) {
          unlockDate = new Date(dailyMilestones.first10Date).toISOString();
        }

        return {
          user_id: userId,
          achievement_id: id,
          unlocked_at: unlockDate,
          is_celebrated: false,
        };
      });

      await safeQuery(
        supabase.from('user_achievements').upsert(updates, {
          onConflict: 'user_id,achievement_id',
          ignoreDuplicates: true,
        }),
        'Error upserting unlocked achievements'
      );

      // Trigger celebration popups
      queryClient.invalidateQueries({
        queryKey: achievementKeys.uncelebrated(userId),
      });
    }

    const hasDbAchievements = dbUnlocked.length > 0;
    const isHydrated = !!stats.currentRank;
    const isIncompleteLoad = hasDbAchievements && !isHydrated;

    if (!isIncompleteLoad) {
      const toRevoke = [...dbIds].filter((id) => {
        if (eligibleIds.has(id)) return false;

        const achievementDef = ACHIEVEMENTS.find((a) => a.id === id);
        if (achievementDef?.isPermanent) return false;

        if (id.startsWith('RANK_UP:')) return false;

        return true;
      });

      if (toRevoke.length > 0) {
        await safeQuery(
          supabase
            .from('user_achievements')
            .delete()
            .eq('user_id', userId)
            .in('achievement_id', toRevoke),
          'Error revoking achievements'
        );
      }
    }

    return toUnlock.length > 0;
  } catch (error) {
    logger.error(
      'useAchievements',
      'syncAchievements',
      'Error during achievement sync:',
      error
    );
    return false;
  }
}

/**
 * Hook to implicitly synchronize user achievements upon progression.
 */
export function useSyncAchievementsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (context: Omit<SyncContext, 'queryClient'>) =>
      syncAchievements({ ...context, queryClient }),
    onSuccess: (hasNewUnlocks, variables) => {
      if (hasNewUnlocks) {
        queryClient.invalidateQueries({
          queryKey: achievementKeys.uncelebrated(variables.userId),
        });
      }
    },
    onError: (err) => {
      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || err.message?.includes('AbortError'));
      if (!isAbort) {
        logger.error(
          'useAchievements',
          'useSyncAchievementsMutation',
          'Achievement Sync Mutation Error:',
          err
        );
      }
    },
  });
}

/**
 * Hook to fetch unacknowledged/uncelebrated achievements to present popups.
 */
export function useUncelebratedQuery(userId: string | undefined) {
  return useQuery({
    queryKey: achievementKeys.uncelebrated(userId || 'guest'),
    queryFn: async () => {
      if (!userId) return [];

      const { data, success } = await safeQuery(
        supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', userId)
          .eq('is_celebrated', false),
        'Error fetching uncelebrated achievements'
      );

      if (!success) throw new Error('Error fetching uncelebrated achievements');
      return data || [];
    },
    enabled: !!userId,
    refetchInterval: 10000,
  });
}

/**
 * Hook to retrieve the user's unlocked achievement list.
 */
export function useAchievements(userId: string) {
  return useQuery({
    queryKey: [...achievementKeys.all, 'list', userId],
    queryFn: async () => {
      if (!userId) return [];
      const unlocked = await getUnlockedAchievements(userId);
      const unlockedIds = new Set(unlocked.map((u) => u.id));

      return ACHIEVEMENTS.map((a) => ({
        ...a,
        isUnlocked: unlockedIds.has(a.id),
        unlockedAt: unlocked.find((u) => u.id === a.id)?.unlockedAt,
      }));
    },
    enabled: !!userId,
  });
}

/**
 * Marks an achievement as celebrated to suppress future popups.
 */
export async function markAsCelebrated(
  userId: string,
  achievementId: string
): Promise<void> {
  try {
    const { success } = await safeQuery(
      supabase
        .from('user_achievements')
        .update({ is_celebrated: true })
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)
        .eq('is_celebrated', false),
      'Error marking achievement as celebrated'
    );

    if (!success) throw new Error('Failed to mark as celebrated');
  } catch {
    // Başarı kutlaması kritik olmayan bir yan etki; hata durumunda sessizce devam edilir.
  }
}
