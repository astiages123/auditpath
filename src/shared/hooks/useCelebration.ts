
import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/features/auth";
import { useProgress } from "@/shared/hooks/useProgress";
import { useCelebrationStore } from "@/shared/store/celebration-store";
import { getCelebrationAsset } from "@/shared/lib/ui/celebration-assets";
import { 
    useSyncAchievementsMutation, 
    useUncelebratedQuery, 
    markAsCelebrated 
} from "@/features/achievements";

export function useCelebration() {
  const { stats, isLoading } = useProgress();
  const { user } = useAuth();
  const enqueue = useCelebrationStore((state) => state.enqueue);
  const lastStatsRef = useRef<string>("");

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

            try {
                // Mark as celebrated in DB first to avoid loops
                await markAsCelebrated(user.id, id);
                
                // Then enqueue UI
                const asset = getCelebrationAsset(id);
                enqueue({
                    id,
                    ...asset
                });
            } catch (err) {
                console.error(`[Celebration Error] Failed to process ${id}:`, err);
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
         courseProgress: stats.courseProgress
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
    revokeRankCelebration: triggerManualSync
  };
}
