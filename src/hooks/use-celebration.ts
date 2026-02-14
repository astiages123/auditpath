import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/auth.hook";
import { useProgress } from "@/hooks/use-progress";
import { useUIStore } from "@/store/ui.store";
import { getCelebrationAsset } from "@/features/achievements/celebration-assets";
import { markAsCelebrated } from "@/features/achievements/achievements.hook";
import { useSyncAchievementsMutation } from "@/features/achievements/achievements.hook";
import { useUncelebratedQuery } from "@/features/achievements/achievements.hook";
import { logger } from "@/utils/logger";

export function useCelebration() {
  const { stats, isLoading } = useProgress();
  const { user } = useAuth();
  const enqueue = useUIStore((state) => state.actions.enqueueCelebration);
  const lastStatsRef = useRef<string>("");

  // Prevent double-processing of the same achievement ID during the session
  const processingIds = useRef<Set<string>>(new Set());

  // 1. Uncelebrated Query (Polling/Realtime)
  const { data: uncelebrated } = useUncelebratedQuery(user?.id);

  // 2. Sync Mutation
  const { mutate: syncAchievements } = useSyncAchievementsMutation();

  // 3. Queue Processor
  // When 'uncelebrated' data changes (from query), process them
  useEffect(() => {
    if (!uncelebrated || uncelebrated.length === 0 || !user) return;

    const processQueue = async () => {
      for (const item of uncelebrated) {
        const id = item.achievement_id;

        // SKIP if already processing/processed in this session loop
        if (processingIds.current.has(id)) continue;
        processingIds.current.add(id);

        try {
          // We do NOT mark as celebrated immediately anymore.
          // Instead, we pass a callback to be called when the user actually closes the modal.
          const handleClose = async () => {
            try {
              await markAsCelebrated(user.id, id);
            } catch (e) {
              logger.error(
                `Failed to mark achievement ${id} as celebrated`,
                e as Error,
              );
            } finally {
              processingIds.current.delete(id);
            }
          };

          // Then enqueue UI
          const asset = getCelebrationAsset(id);
          enqueue({
            id,
            ...asset,
            onClose: handleClose,
          });
        } catch (err) {
          logger.error(
            `[Celebration Error] Failed to process ${id}:`,
            err as Error,
          );
          processingIds.current.delete(id);
        }
      }
    };

    processQueue();
  }, [uncelebrated, user, enqueue]);

  // 4. Trigger Sync on Stats Change
  useEffect(() => {
    if (isLoading || !stats || !user) return;

    const currentStatsHash = JSON.stringify({
      completed: stats.completedVideos,
      streak: stats.streak,
      rank: stats.currentRank?.id,
      courseProgress: stats.courseProgress,
    });

    if (currentStatsHash !== lastStatsRef.current) {
      lastStatsRef.current = currentStatsHash;
      // Fire and forget mutation
      syncAchievements({ stats, userId: user.id });
    }
  }, [stats, isLoading, user, syncAchievements]);

  // Exposed helpers for manual triggers if needed
  const triggerManualSync = useCallback(() => {
    if (user && stats) {
      syncAchievements({ stats, userId: user.id });
    }
  }, [user, stats, syncAchievements]);

  return {
    checkCelebrations: () => {}, // Deprecated/No-op as query handles it
    triggerCourseCelebration: triggerManualSync,
    triggerCategoryCelebration: triggerManualSync,
    revokeCourseCelebration: triggerManualSync,
    revokeCategoryCelebration: triggerManualSync,
    revokeRankCelebration: triggerManualSync,
  };
}
