import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/shared/lib/core/supabase";
import {
    getDailyVideoMilestones,
    getStreakMilestones,
    getTotalActiveDays,
    getUnlockedAchievements,
} from "@/shared/lib/core/client-db";
import {
    ACHIEVEMENTS,
    calculateAchievements,
} from "@/shared/lib/domain/achievements";
import { type Rank, RANKS } from "@/config/constants";
import { ProgressStats } from "@/shared/hooks/useProgress";
import coursesData from "@/features/courses/data/courses.json";

export const achievementKeys = {
    all: ["achievements"] as const,
    uncelebrated: (userId: string) =>
        [...achievementKeys.all, "uncelebrated", userId] as const,
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
    const dbIds = new Set(dbUnlocked.map((x) => x.achievement_id));

    // B. Calculate Eligible IDs
    const eligibleIds = new Set<string>();

    // 1. Algorithmic
    const algoIds = calculateAchievements(stats, activityLog);
    algoIds.forEach((id) => eligibleIds.add(id));

    // 2. Rank
    const currentRankId = stats.currentRank?.id;
    const currentRankOrder =
        (RANKS as Rank[]).find((r: Rank) => r.id === currentRankId)?.order ??
            -1;

    if (currentRankOrder >= 0) {
        (RANKS as Rank[]).forEach((r: Rank) => {
            if (r.order <= currentRankOrder) {
                // Ensure "Sürgün" (Order 1) or any rank 0 logic triggers only if user has activity.
                // Specifically for "Sürgün", require at least 1 video.
                if (r.id === "1" && (stats.completedVideos || 0) < 1) return;

                eligibleIds.add(`RANK_UP:${r.id}`);
            }
        });
    }

    // 3. Course/Category
    (coursesData as Array<
        {
            category: string;
            courses: Array<{ id: string; totalVideos: number }>;
        }
    >).forEach((cat) => {
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
            if (id === "special-01" && dailyMilestones.first5Date) {
                unlockDate = new Date(dailyMilestones.first5Date).toISOString();
            }
            // Zihinsel Maraton (10+ video) - ilk kez 10+ video izlenen gün
            if (id === "special-02" && dailyMilestones.first10Date) {
                unlockDate = new Date(dailyMilestones.first10Date)
                    .toISOString();
            }
            // Sönmeyen Meşale (7 gün seri) - ilk kez 7 günlük streak tamamlandığı gün
            if (id === "special-03" && streakMilestones.first7StreakDate) {
                unlockDate = new Date(streakMilestones.first7StreakDate)
                    .toISOString();
            }

            return {
                user_id: userId,
                achievement_id: id,
                unlocked_at: unlockDate,
                is_celebrated: false,
            };
        });

        await supabase.from("user_achievements").upsert(updates, {
            onConflict: "user_id,achievement_id",
            ignoreDuplicates: true,
        });

        // Anlık kutlama tetiklemesi - 10 saniye beklemeye gerek yok
        queryClient.invalidateQueries({
            queryKey: achievementKeys.uncelebrated(userId),
        });
    }

    // F. Revoke Logic (SAFEGUARDED)
    const hasDbAchievements = dbUnlocked.length > 0;
    const isHydrated = !!stats.currentRank;

    const isIncompleteLoad = hasDbAchievements && !isHydrated;

    if (!isIncompleteLoad) {
        const staticIds = ACHIEVEMENTS.map((a) => a.id);
        const knownPrefixes = [
            "RANK_UP:",
            "COURSE_COMPLETION:",
            "CATEGORY_COMPLETION:",
        ];

        // Event-based achievements that should NEVER be revoked once earned
        // Actually, the requirements specificy: "daily_progress", "streak", "total_active_days" should not be revoked.
        // But "category_progress", "all_progress" can be.
        // Let's filter by requirement type from the generated list, but since we only have IDs here, we need to lookup.

        const toRevoke = [...dbIds].filter((id) => {
            const isManaged = knownPrefixes.some((p) => id.startsWith(p)) ||
                staticIds.includes(id);
            if (!isManaged) return false;

            // Extra safety for Rank-Up - NEVER revoke rank achievements
            if (id.startsWith("RANK_UP:")) return false;

            // CHECK: Is this an achievement we want to allow revoking?
            // We only allow revoking if it is NOT an event-based one.
            const achievementDef = ACHIEVEMENTS.find((a) => a.id === id);
            if (achievementDef) {
                const type = achievementDef.requirement.type;
                const isEventBased = [
                    "daily_progress",
                    "streak",
                    "total_active_days",
                ].includes(type);
                if (isEventBased) return false; // Never revoke event-based ones
            }

            // If it's already in DB and not event-based, but somehow lost its "eligible" status
            // we check if it should be revoked only if it's NOT an event-based one.
            return !eligibleIds.has(id);
        });

        if (toRevoke.length > 0) {
            await supabase
                .from("user_achievements")
                .delete()
                .eq("user_id", userId)
                .in("achievement_id", toRevoke);
        }
    }

    return toUnlock.length > 0;
}

export function useSyncAchievementsMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (context: Omit<SyncContext, "queryClient">) =>
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
            const isAbort = err instanceof Error &&
                (err.name === "AbortError" ||
                    err.message?.includes("AbortError"));
            if (!isAbort) {
                console.error("Achievement Sync Mutation Error:", err);
            }
        },
    });
}

export function useUncelebratedQuery(userId: string | undefined) {
    return useQuery({
        queryKey: achievementKeys.uncelebrated(userId || "guest"),
        queryFn: async () => {
            if (!userId) return [];

            const { data, error } = await supabase
                .from("user_achievements")
                .select("achievement_id")
                .eq("user_id", userId)
                .eq("is_celebrated", false);

            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
        refetchInterval: 10000,
    });
}

export async function markAsCelebrated(userId: string, achievementId: string) {
    const { error } = await supabase
        .from("user_achievements")
        .update({ is_celebrated: true })
        .eq("user_id", userId)
        .eq("achievement_id", achievementId)
        .eq("is_celebrated", false); // Concurrency safety

    if (error) throw error;
}
