import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/shared/lib/core/supabase";
import {
    getTotalActiveDays,
    getUnlockedAchievements,
} from "@/shared/lib/core/client-db";
import { getVirtualDayStart } from "@/shared/lib/utils/date-utils";
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
}

// Helper to keep the mutation function clean
async function syncAchievements({ stats, userId }: SyncContext) {
    if (!userId || !stats) return;

    // A. Gather Data
    const totalActiveDays = await getTotalActiveDays(userId);

    // 2. Daily Videos Count
    const todayStart = getVirtualDayStart();

    const { count: dailyVideosCount, error: dailyError } = await supabase
        .from("video_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("updated_at", todayStart.toISOString());

    if (dailyError) {
        // Check for AbortError implicitly handled by react-query if logic was inside queryFn,
        // but here we are in a mutation. Mutations don't auto-retry on network errors by default
        // but we can just log safely.
        const isAbort = dailyError.message?.includes("AbortError") ||
            dailyError.code === "ABORT_ERROR";
        if (!isAbort) {
            console.error("Failed to fetch daily video count:", dailyError);
        }
    }

    const activityLog = {
        currentStreak: stats.streak || 0,
        totalActiveDays,
        dailyVideosCompleted: dailyVideosCount || 0,
        // Default values for missing stats to satisfy interface
        honestyUsageCount: 0,
        firstTimePerfectCount: 0,
        debtClearedInSession: false,
        consecutiveCorrectStreak: 0,
        weeklyStudyDays: 0,
        masteredTopicsCount: 0,
    };

    // C. Fetch Current DB State
    const dbUnlocked = await getUnlockedAchievements(userId);
    const dbIds = new Set(dbUnlocked.map((x) => x.id));

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
        const updates = toUnlock.map((id) => ({
            user_id: userId,
            achievement_id: id,
            unlocked_at: new Date().toISOString(),
            is_celebrated: false,
        }));

        await supabase.from("user_achievements").upsert(updates, {
            onConflict: "user_id,achievement_id",
            ignoreDuplicates: true,
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

            // Extra safety for Rank-Up
            if (id.startsWith("RANK_UP:") && !currentRankId) return false;

            // CHECK: Is this an achievement we want to allow revoking?
            // We only allow revoking if it is NOT an event-based one.
            const achievementDef = ACHIEVEMENTS.find((a) => a.id === id);
            if (achievementDef) {
                const type = achievementDef.requirement.type;
                const isEventBased = [
                    "daily_progress",
                    "streak",
                    "total_active_days",
                    "quiz_honesty",
                    "first_time_perfect",
                    "clear_debt",
                    "consecutive_correct",
                    "weekly_review_streak",
                    "topic_mastery_count",
                ].includes(type);
                if (isEventBased) return false; // Never revoke event-based ones
            }

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
        mutationFn: syncAchievements,
        onSuccess: (hasNewUnlocks, variables) => {
            if (hasNewUnlocks) {
                // Invalidate uncelebrated query to trigger celebration check
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
