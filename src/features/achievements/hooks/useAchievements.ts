import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getDailyVideoMilestones } from '@/features/courses/services/videoService';
import {
  getStreakMilestones,
  getTotalActiveDays,
} from '@/features/achievements/services/userStatsService';
import { getUnlockedAchievements } from '@/features/achievements/services/achievementService';
import { ACHIEVEMENTS, calculateAchievements } from '../logic/achievementsData';
import { type ProgressStats } from '../types/achievementsTypes';
import { RANKS } from '../utils/constants';
import type { Rank } from '@/types/auth';
import coursesData from '@/features/courses/services/courses.json';
import { logger } from '@/utils/logger';

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

// Helper to keep the mutation function clean
async function syncAchievements({ stats, userId, queryClient }: SyncContext) {
  if (!userId || !stats) return;

  // A. Gather Data
  const totalActiveDays = await getTotalActiveDays(userId);

  // 2. Daily Video Milestones (5+ ve 10+ için ilk tarihler)
  const dailyMilestones = await getDailyVideoMilestones(userId);

  // 3. Streak Milestones (7 gün seri için ilk tarih)
  const streakMilestones = await getStreakMilestones(userId);

  const activityLog = {
    currentStreak: stats.streak,
    totalActiveDays,
    dailyVideosCompleted: dailyMilestones.maxCount,
  };

  // C. Fetch Current DB State
  const dbUnlocked = await getUnlockedAchievements(userId);
  const dbIds = new Set<string>(dbUnlocked.map((x) => x.id));

  // B. Calculate Eligible IDs
  const eligibleIds = new Set<string>();

  // 1. Algorithmic
  const algoIds = calculateAchievements(stats, activityLog);
  algoIds.forEach((id) => eligibleIds.add(id));

  // 2. Rank
  const currentRankId = stats.currentRank?.id;
  const currentRankOrder =
    (RANKS as Rank[]).find((r: Rank) => r.id === currentRankId)?.order ?? -1;

  if (currentRankOrder >= 0) {
    (RANKS as Rank[]).forEach((r: Rank) => {
      if (r.order <= currentRankOrder) {
        // Sürgün (Rank 1) is handled by algorithmic check (minimum_videos >= 1)
        // We skip adding it here to avoid bypassing that check.
        if (r.id === '1') return;

        eligibleIds.add(`RANK_UP:${r.id}`);
      }
    });
  }

  // 3. Course/Category
  (
    coursesData as Array<{
      category: string;
      courses: Array<{ id: string; totalVideos: number }>;
    }>
  ).forEach((cat) => {
    let catCompleted = true;
    cat.courses.forEach((c) => {
      const doneCount = stats.courseProgress[c.id] || 0;
      if (doneCount >= c.totalVideos && c.totalVideos > 0) {
        eligibleIds.add(`COURSE_COMPLETION:${c.id}`);
      } else {
        catCompleted = false;
      }
    });
    if (catCompleted && cat.courses.length > 0) {
      eligibleIds.add(`CATEGORY_COMPLETION:${cat.category}`);
    }
  });

  // D. Determine Unlocks
  const toUnlock = [...eligibleIds].filter((id) => !dbIds.has(id));

  // E. Execute Updates (UNLOCKS)
  if (toUnlock.length > 0) {
    const updates = toUnlock.map((id) => {
      // daily_progress başarımları için gerçek başarılma tarihini kullan
      let unlockDate = new Date().toISOString();

      // Gece Nöbetçisi (5+ video) - ilk kez 5+ video izlenen gün
      if (id === 'special-01' && dailyMilestones.first5Date) {
        unlockDate = new Date(dailyMilestones.first5Date).toISOString();
      }
      // Zihinsel Maraton (10+ video) - ilk kez 10+ video izlenen gün
      if (id === 'special-02' && dailyMilestones.first10Date) {
        unlockDate = new Date(dailyMilestones.first10Date).toISOString();
      }
      // Sönmeyen Meşale (7 gün seri) - ilk kez 7 günlük streak tamamlandığı gün
      if (id === 'special-03' && streakMilestones.first7DayStreakDate) {
        unlockDate = new Date(
          streakMilestones.first7DayStreakDate
        ).toISOString();
      }

      return {
        user_id: userId,
        achievement_id: id,
        unlocked_at: unlockDate,
        is_celebrated: false,
      };
    });

    await supabase.from('user_achievements').upsert(updates, {
      onConflict: 'user_id,achievement_id',
      ignoreDuplicates: true,
    });

    // Anlık kutlama tetiklemesi - 10 saniye beklemeye gerek yok
    queryClient.invalidateQueries({
      queryKey: achievementKeys.uncelebrated(userId),
    });
  }

  // F. Revoke Logic (SAFEGUARDED with isPermanent)
  const hasDbAchievements = dbUnlocked.length > 0;
  const isHydrated = !!stats.currentRank;

  // Prevent revoking everything if stats are not fully loaded
  const isIncompleteLoad = hasDbAchievements && !isHydrated;

  if (!isIncompleteLoad) {
    const toRevoke = [...dbIds].filter((id) => {
      // 1. If currently eligible, keep it.
      if (eligibleIds.has(id)) return false;

      // 2. Check definition for isPermanent flag
      const achievementDef = ACHIEVEMENTS.find((a) => a.id === id);

      // If it has isPermanent: true, NEVER revoke it.
      if (achievementDef?.isPermanent) return false;

      // 3. Logic for dynamic/generated IDs (COURSE_COMPLETION, etc.)
      // Rank achievements are now permanent (via ACHIEVEMENTS check or implicit rule)
      // But if they are NOT in ACHIEVEMENTS (shouldn't happen for ranks), we might need safety.
      // ACHIEVEMENTS array contains RANK_UP:1..4 with isPermanent: true.

      // For COURSE/CATEGORY completions: they are NOT in ACHIEVEMENTS array generally?
      // The file `achievements.ts` only lists badge-linked achievements.
      // If COURSE_COMPLETION is not in the array, achievementDef is undefined.
      // We need to decide if they are permanent.
      // Usually valid-course-completion should be revocable if progress drops?
      // "Sadece isPermanent: false olan (veya undefined) ve artık gereksinimi karşılamayan başarımları sil."

      // Special handling for legacy/generated IDs that might not be in ACHIEVEMENTS:
      // If it starts with RANK_UP, assume permanent if not found in list (Safety).
      if (id.startsWith('RANK_UP:')) return false;

      // Event based checks (Fallback if not in ACHIEVEMENTS list correctly)
      const isEventBasedPrefix = [
        'streak', // Not a prefix usually, but purely safe
        // Add any other prefixes if needed.
      ];
      if (isEventBasedPrefix.some((p) => id.includes(p))) return false;

      // Otherwise, if not eligible and neither permanent nor protected, revoke.
      return true;
    });

    if (toRevoke.length > 0) {
      await supabase
        .from('user_achievements')
        .delete()
        .eq('user_id', userId)
        .in('achievement_id', toRevoke);
    }
  }

  return toUnlock.length > 0;
}

export function useSyncAchievementsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (context: Omit<SyncContext, 'queryClient'>) =>
      syncAchievements({ ...context, queryClient }),
    onSuccess: (hasNewUnlocks, variables) => {
      // The immediate invalidation is now done inside syncAchievements
      // This onSuccess is kept for backward compatibility but may be redundant
      if (hasNewUnlocks) {
        queryClient.invalidateQueries({
          queryKey: achievementKeys.uncelebrated(variables.userId),
        });
      }
    },
    onError: (err) => {
      // Safe error logging
      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || err.message?.includes('AbortError'));
      if (!isAbort) {
        logger.error('Achievement Sync Mutation Error:', err as Error);
      }
    },
  });
}

export function useUncelebratedQuery(userId: string | undefined) {
  return useQuery({
    queryKey: achievementKeys.uncelebrated(userId || 'guest'),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId)
        .eq('is_celebrated', false);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    refetchInterval: 10000,
  });
}

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

export async function markAsCelebrated(userId: string, achievementId: string) {
  const { error } = await supabase
    .from('user_achievements')
    .update({ is_celebrated: true })
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .eq('is_celebrated', false); // Concurrency safety

  if (error) throw error;
}
