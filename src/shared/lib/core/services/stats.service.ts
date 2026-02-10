import { supabase } from "@/shared/lib/core/supabase";
import type { Database, Json } from "@/shared/types/supabase";
import type { Category, Course } from "@/shared/types/courses";
import {
    calculateFocusPower,
    calculateLearningFlow,
    getCycleCount,
} from "@/features/pomodoro/lib/pomodoro-utils";
import {
    formatDateKey,
    getVirtualDate,
    getVirtualDateKey,
} from "@/shared/lib/utils/date-utils";
import {
    calculateStreak,
    calculateStreakMilestones,
} from "@/shared/lib/core/utils/streak-utils";
import {
    getNextRank,
    getRankForPercentage,
} from "@/shared/lib/core/utils/rank-utils";
import type { Rank } from "@/shared/lib/core/utils/rank-utils";
import { normalizeCategorySlug } from "@/shared/lib/core/utils/category-utils";
import coursesData from "@/features/courses/data/courses.json";
import type {
    CourseMastery,
    CumulativeStats,
    DailyEfficiencySummary,
    DailyStats,
    DayActivity,
    DetailedSession,
    EfficiencyData,
    EfficiencyTrend,
    FocusTrend,
    HistoryStats,
    StreakMilestones,
} from "@/shared/types/efficiency";

/**
 * Get comprehensive user statistics including progress, streak, and rank.
 *
 * @param userId User ID
 * @returns User statistics or null on error
 */
export async function getUserStats(userId: string) {
    try {
        // Get categories
        const { data: categories, error: catError } = await supabase
            .from("categories")
            .select("*, courses(*)")
            .order("sort_order");

        if (catError) {
            throw catError;
        }

        const cats = (categories || []) as Category[];

        const courseToCategoryMap: Record<string, string> = {};
        const courseIdToSlugMap: Record<string, string> = {};

        cats.forEach((cat) => {
            cat.courses.forEach((course) => {
                courseToCategoryMap[course.id] = cat.name;
                courseIdToSlugMap[course.id] = course.course_slug;
            });
        });

        // Use static data for totals to ensure consistency even if categories table is transiently empty or partial
        const totalHoursFromJSON = coursesData.reduce(
            (sum: number, cat) =>
                sum +
                ((cat as { courses?: { totalHours?: number }[] }).courses
                    ?.reduce(
                        (s: number, c) => s + (c.totalHours || 0),
                        0,
                    ) || 0),
            0,
        );
        const totalVideosFromJSON = coursesData.reduce(
            (sum: number, cat) =>
                sum +
                ((cat as { courses?: { totalVideos?: number }[] }).courses
                    ?.reduce(
                        (s: number, c) => s + (c.totalVideos || 0),
                        0,
                    ) || 0),
            0,
        );

        const dbTotalHours = cats.reduce(
            (sum, cat) => sum + (cat.total_hours || 0),
            0,
        );
        const dbTotalVideos = cats.reduce(
            (sum, cat) =>
                sum +
                cat.courses.reduce((s, c) => s + (c.total_videos || 0), 0),
            0,
        );

        const globalTotalHours = dbTotalHours > 0
            ? dbTotalHours
            : totalHoursFromJSON || 280;
        const globalTotalVideos = dbTotalVideos > 0
            ? dbTotalVideos
            : totalVideosFromJSON || 550;

        const { data: progress, error: progressError } = await supabase
            .from("video_progress")
            .select("*, video:videos(duration_minutes, course_id)")
            .eq("user_id", userId)
            .eq("completed", true);

        if (progressError) {
            throw progressError;
        }

        const completedVideos = progress?.length || 0;
        let completedHours = 0;
        const courseProgress: Record<string, number> = {};
        const categoryProgress: Record<
            string,
            {
                completedVideos: number;
                completedHours: number;
                totalVideos: number;
                totalHours: number;
            }
        > = {};

        // --- Dynamic Logic Implementation ---

        // 1. Collect Active Days
        const activeDays = new Set<string>();
        let firstActivityDate: Date | null = null;

        if (progress) {
            for (const p of progress) {
                const dateStr = p.completed_at || p.updated_at;
                if (dateStr) {
                    const d = new Date(dateStr);
                    const formattedDate = getVirtualDateKey(d);

                    activeDays.add(formattedDate);

                    const rawDate = new Date(dateStr);
                    if (!firstActivityDate || rawDate < firstActivityDate) {
                        firstActivityDate = rawDate;
                    }
                }

                const video = p.video as unknown as {
                    duration_minutes: number;
                    course_id: string;
                };
                if (video) {
                    const durationHours = video.duration_minutes / 60;
                    completedHours += durationHours;

                    const courseSlug = courseIdToSlugMap[video.course_id] ||
                        video.course_id;
                    courseProgress[courseSlug] =
                        (courseProgress[courseSlug] || 0) + 1;

                    const catName = courseToCategoryMap[video.course_id];
                    if (catName) {
                        const normalizedCatName = normalizeCategorySlug(
                            catName,
                        );
                        if (!categoryProgress[normalizedCatName]) {
                            const cat = cats.find((c) => c.name === catName);
                            categoryProgress[normalizedCatName] = {
                                completedVideos: 0,
                                completedHours: 0,
                                totalVideos: cat?.courses.reduce((sum, c) =>
                                    sum + (c.total_videos || 0), 0) || 0,
                                totalHours: cat?.total_hours || 0,
                            };
                        }
                        categoryProgress[normalizedCatName].completedVideos +=
                            1;
                        categoryProgress[normalizedCatName].completedHours +=
                            durationHours;
                    }
                }
            }
        }

        // Calculate progress percentage based on HOURS instead of counts
        const progressPercentage = Math.round(
            (completedHours / globalTotalHours) * 100,
        );

        let currentRank: Rank | undefined;
        let nextRank: Rank | null;
        let rankProgress = 0;

        if (completedVideos > 0) {
            currentRank = getRankForPercentage(progressPercentage);
            nextRank = getNextRank(currentRank.id);

            // Calculate rank progress
            if (nextRank) {
                const minP = currentRank.minPercentage;
                const nextMinP = nextRank.minPercentage;
                const diff = nextMinP - minP;
                rankProgress = diff > 0
                    ? Math.min(
                        100,
                        Math.max(
                            0,
                            Math.round(
                                ((progressPercentage - minP) / diff) * 100,
                            ),
                        ),
                    )
                    : 100;
            } else {
                // Max rank
                rankProgress = 100;
            }
        } else {
            // No videos completed yet -> No active rank
            currentRank = undefined;
            nextRank = null;
            rankProgress = 0;
        }

        // 2. Calculate Streak using utility function
        const firstActivityKey = firstActivityDate
            ? getVirtualDateKey(firstActivityDate)
            : null;

        const streak = calculateStreak(activeDays, firstActivityKey);

        // 3. Estimate Days Remaining
        let estimatedDays = 0;
        const totalHours = globalTotalHours;
        const hoursRemaining = Math.max(0, totalHours - completedHours);

        if (hoursRemaining > 0) {
            if (activeDays.size > 0 && completedHours > 0) {
                const dailyAveragePerActiveDay = completedHours /
                    activeDays.size;

                if (dailyAveragePerActiveDay > 0) {
                    estimatedDays = Math.ceil(
                        hoursRemaining / dailyAveragePerActiveDay,
                    );
                } else {
                    estimatedDays = 999;
                }
            } else {
                estimatedDays = Math.ceil(hoursRemaining / 2);
            }
        } else {
            estimatedDays = 0;
        }

        const dailyAverage = activeDays.size > 0
            ? completedHours / activeDays.size
            : 0;

        return {
            completedVideos,
            totalVideos: globalTotalVideos,
            completedHours: Math.round(completedHours * 10) / 10,
            totalHours,
            streak,
            categoryProgress,
            courseProgress,
            currentRank,
            nextRank,
            rankProgress,
            progressPercentage,
            estimatedDays,
            dailyAverage,
            todayVideoCount: (() => {
                const checkTodayStr = getVirtualDateKey();

                if (!progress) {
                    return 0;
                }

                return progress.filter((p) => {
                    const dateStr = p.completed_at || p.updated_at;
                    if (!dateStr) {
                        return false;
                    }

                    const pStr = getVirtualDateKey(new Date(dateStr));
                    return pStr === checkTodayStr;
                }).length;
            })(),
        };
    } catch (error: unknown) {
        const e = error as { name?: string; message?: string };
        if (e?.name === "AbortError" || e?.message?.includes("AbortError")) {
            return null;
        }
        return null;
    }
}

/**
 * Get total number of active days for a user.
 *
 * @param userId User ID
 * @returns Number of unique active days
 */
export async function getTotalActiveDays(userId: string) {
    const { data, error } = await supabase
        .from("pomodoro_sessions")
        .select("started_at")
        .eq("user_id", userId);

    if (error || !data) return 0;

    const days = new Set(data.map((d) => {
        const date = new Date(d.started_at);
        return `${date.getFullYear()}-${
            String(date.getMonth() + 1).padStart(2, "0")
        }-${String(date.getDate()).padStart(2, "0")}`;
    }));
    return days.size;
}

/**
 * Get streak milestones (max streak and first 7-day streak date).
 *
 * @param userId User ID
 * @returns Streak milestones
 */
export async function getStreakMilestones(
    userId: string,
): Promise<StreakMilestones> {
    const { data, error } = await supabase
        .from("video_progress")
        .select("completed_at")
        .eq("user_id", userId)
        .eq("completed", true)
        .not("completed_at", "is", null);

    if (error || !data || data.length === 0) {
        return { maxStreak: 0, first7StreakDate: null };
    }

    // Collect unique active days
    const activeDaysSet = new Set<string>();
    for (const row of data) {
        if (!row.completed_at) continue;
        const date = new Date(row.completed_at);
        const dayKey = `${date.getFullYear()}-${
            String(date.getMonth() + 1).padStart(2, "0")
        }-${String(date.getDate()).padStart(2, "0")}`;
        activeDaysSet.add(dayKey);
    }

    const activeDays = [...activeDaysSet].sort();

    if (activeDays.length === 0) {
        return { maxStreak: 0, first7StreakDate: null };
    }

    // Use utility function for streak calculation
    return calculateStreakMilestones(activeDays);
}

/**
 * Get daily statistics with virtual day logic (day starts at 04:00).
 *
 * @param userId User ID
 * @returns Daily statistics
 */
export async function getDailyStats(userId: string): Promise<DailyStats> {
    const now = new Date();
    const today = new Date(now);

    // Virtual Day Logic: Day starts at 04:00 AM
    if (now.getHours() < 4) {
        today.setDate(today.getDate() - 1);
    }
    today.setHours(4, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Fetch Today's Pomodoro Stats
    const { data: todaySessions, error: todayError } = await supabase
        .from("pomodoro_sessions")
        .select("total_work_time, total_break_time, total_pause_time, timeline")
        .eq("user_id", userId)
        .gte("started_at", today.toISOString())
        .lt("started_at", tomorrow.toISOString())
        .or("total_work_time.gte.60,total_break_time.gte.60");

    if (todayError) {
        console.error("Error fetching daily stats:", todayError);
    }

    // 2. Fetch Yesterday's Pomodoro Stats (for Trend)
    const { data: yesterdaySessions } = await supabase
        .from("pomodoro_sessions")
        .select("total_work_time")
        .eq("user_id", userId)
        .gte("started_at", yesterday.toISOString())
        .lt("started_at", today.toISOString());

    // 3. Fetch Video Stats (Today & Yesterday)
    const { data: todayVideos } = await supabase
        .from("video_progress")
        .select("video_id, video:videos(duration_minutes)")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("completed_at", today.toISOString())
        .lt("completed_at", tomorrow.toISOString());

    const { data: yesterdayVideos } = await supabase
        .from("video_progress")
        .select("video_id")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("completed_at", yesterday.toISOString())
        .lt("completed_at", today.toISOString());

    // DB stores Seconds. UI expects Minutes.
    const todaySessionsData = todaySessions || [];
    const totalWorkSeconds = todaySessionsData.reduce(
        (acc, s) => acc + (s.total_work_time || 0),
        0,
    ) ||
        0;
    const totalBreakSeconds = todaySessionsData.reduce(
        (acc, s) => acc + (s.total_break_time || 0),
        0,
    ) ||
        0;
    const totalPauseSeconds = todaySessionsData.reduce(
        (acc, s) => acc + (s.total_pause_time || 0),
        0,
    ) ||
        0;

    // Calculate total cycles
    const totalCycles = todaySessionsData.reduce(
        (acc, s) => acc + getCycleCount(s.timeline),
        0,
    );

    const totalWorkMinutes = Math.round(totalWorkSeconds / 60);
    const totalBreakMinutes = Math.round(totalBreakSeconds / 60);
    const totalPauseMinutes = Math.round(totalPauseSeconds / 60);

    const sessionCount = totalCycles;

    const yesterdayWorkSeconds = yesterdaySessions?.reduce(
        (acc, s) => acc + (s.total_work_time || 0),
        0,
    ) ||
        0;
    const yesterdayWorkMinutes = Math.round(yesterdayWorkSeconds / 60);

    // Calculate Trend
    let trendPercentage = 0;
    if (yesterdayWorkMinutes === 0) {
        trendPercentage = totalWorkMinutes > 0 ? 100 : 0;
    } else {
        trendPercentage = Math.round(
            ((totalWorkMinutes - yesterdayWorkMinutes) / yesterdayWorkMinutes) *
                100,
        );
    }

    // Calculate Video Stats
    let totalVideoMinutes = 0;
    const completedVideosCount = todayVideos?.length || 0;

    if (todayVideos) {
        totalVideoMinutes = todayVideos.reduce((acc, vp) => {
            const duration =
                (vp.video as { duration_minutes?: number })?.duration_minutes ||
                0;
            return acc + duration;
        }, 0);
    }

    const yesterdayVideoCount = yesterdayVideos?.length || 0;
    let videoTrendPercentage = 0;
    if (yesterdayVideoCount === 0) {
        videoTrendPercentage = completedVideosCount > 0 ? 100 : 0;
    } else {
        videoTrendPercentage = Math.round(
            ((completedVideosCount - yesterdayVideoCount) /
                yesterdayVideoCount) *
                100,
        );
    }

    const goalMinutes = 200;
    const progress = Math.min(
        100,
        Math.round((totalWorkMinutes / goalMinutes) * 100),
    );

    return {
        totalWorkMinutes,
        totalBreakMinutes,
        sessionCount,
        goalMinutes,
        progress,
        goalPercentage: progress,
        trendPercentage,
        dailyGoal: goalMinutes,
        totalPauseMinutes,
        totalVideoMinutes: Math.round(totalVideoMinutes),
        completedVideos: completedVideosCount,
        videoTrendPercentage,
        totalCycles,
    };
}

/**
 * Get last 30 days activity heatmap.
 *
 * @param userId User ID
 * @returns Array of daily activity data
 */
export async function getLast30DaysActivity(
    userId: string,
): Promise<DayActivity[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from("pomodoro_sessions")
        .select("started_at, total_work_time")
        .eq("user_id", userId)
        .gte("started_at", thirtyDaysAgo.toISOString())
        .or("total_work_time.gte.60,total_break_time.gte.60");

    if (error) {
        console.error("Error fetching activity heatmap:", error);
        return [];
    }

    const dailyCounts: Record<string, { count: number; minutes: number }> = {};
    (data as Database["public"]["Tables"]["pomodoro_sessions"]["Row"][])
        ?.forEach(
            (s) => {
                const d = new Date(s.started_at);
                const dateStr = `${d.getFullYear()}-${
                    String(d.getMonth() + 1).padStart(2, "0")
                }-${String(d.getDate()).padStart(2, "0")}`;
                dailyCounts[dateStr] = {
                    count: (dailyCounts[dateStr]?.count || 0) + 1,
                    minutes: (dailyCounts[dateStr]?.minutes || 0) +
                        (s.total_work_time || 0),
                };
            },
        );

    const heatmap: DayActivity[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - (30 - i));
        const dateStr = `${d.getFullYear()}-${
            String(d.getMonth() + 1).padStart(2, "0")
        }-${String(d.getDate()).padStart(2, "0")}`;
        const count = dailyCounts[dateStr]?.count || 0;

        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (count >= 5) level = 4;
        else if (count >= 3) level = 3;
        else if (count >= 2) level = 2;
        else if (count >= 1) level = 1;

        heatmap.push({
            date: dateStr,
            count,
            level,
            intensity: level,
            totalMinutes: Math.round((dailyCounts[dateStr]?.minutes || 0) / 60),
        });
    }

    return heatmap;
}

/**
 * Get efficiency ratio (video time vs pomodoro time).
 *
 * @param userId User ID
 * @returns Efficiency data
 */
export async function getEfficiencyRatio(
    userId: string,
): Promise<EfficiencyData> {
    const now = new Date();
    const today = new Date(now);
    if (now.getHours() < 4) {
        today.setDate(today.getDate() - 1);
    }
    today.setHours(4, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Fetch Today's Pomodoro Stats
    const { data: todaySessions, error: sessionError } = await supabase
        .from("pomodoro_sessions")
        .select("total_work_time, total_break_time, started_at, ended_at")
        .eq("user_id", userId)
        .gte("started_at", today.toISOString())
        .lt("started_at", tomorrow.toISOString())
        .or("total_work_time.gte.60,total_break_time.gte.60");

    // 2. Fetch Today's Video Stats
    const { data: todayVideos, error: videoError } = await supabase
        .from("video_progress")
        .select("video_id, completed_at, video:videos(duration_minutes)")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("completed_at", today.toISOString())
        .lt("completed_at", tomorrow.toISOString());

    // 3. Fetch Today's Quiz Progress
    const { data: todayQuiz } = await supabase
        .from("user_quiz_progress")
        .select("answered_at")
        .eq("user_id", userId)
        .gte("answered_at", today.toISOString())
        .lt("answered_at", tomorrow.toISOString());

    if (sessionError || videoError) {
        console.error(
            "Error fetching efficiency metrics:",
            sessionError || videoError,
        );
    }

    const sessions =
        (todaySessions as Database["public"]["Tables"]["pomodoro_sessions"][
            "Row"
        ][]) || [];
    const totalWork = sessions.reduce(
        (acc: number, s) => acc + (s.total_work_time || 0),
        0,
    ) || 0;

    let totalVideoMinutes = 0;
    if (todayVideos) {
        totalVideoMinutes = todayVideos.reduce((acc: number, vp) => {
            const video = vp.video as { duration_minutes?: number } | null;
            const duration = video?.duration_minutes || 0;
            return acc + duration;
        }, 0);
    }

    // Quiz Filtering Logic
    let quizSessionMinutes = 0;

    if (todayQuiz && todayQuiz.length > 0) {
        sessions.forEach((session) => {
            const start = new Date(session.started_at).getTime();
            const end = session.ended_at
                ? new Date(session.ended_at).getTime()
                : start +
                    ((session.total_work_time || 0) +
                        (session.total_break_time || 0) * 1000);

            const questionsInSession = todayQuiz.filter((q) => {
                if (!q.answered_at) return false;
                const t = new Date(q.answered_at).getTime();
                return t >= start && t <= end;
            }).length;

            const videosInSession = todayVideos?.filter((v) => {
                if (!v.completed_at) return false;
                const t = new Date(v.completed_at).getTime();
                return t >= start && t <= end;
            }).length || 0;

            if (questionsInSession >= 5 && videosInSession === 0) {
                quizSessionMinutes += Math.round(
                    (session.total_work_time || 0) / 60,
                );
            }
        });
    }

    const totalWorkMinutes = Math.round(totalWork / 60);

    const effectiveWorkMinutes = Math.max(
        totalVideoMinutes,
        totalWorkMinutes - quizSessionMinutes,
    );

    const ratio = effectiveWorkMinutes > 0
        ? Math.round((totalVideoMinutes / effectiveWorkMinutes) * 10) / 10
        : 0.0;

    const efficiencyScore = calculateLearningFlow(
        effectiveWorkMinutes,
        totalVideoMinutes,
    );

    return {
        ratio,
        efficiencyScore,
        trend: "stable",
        isAlarm: ratio > 2.5,
        videoMinutes: Math.round(totalVideoMinutes),
        pomodoroMinutes: totalWorkMinutes,
        quizMinutes: quizSessionMinutes,
    };
}

/**
 * Get cumulative statistics (all-time).
 *
 * @param userId User ID
 * @returns Cumulative statistics
 */
export async function getCumulativeStats(
    userId: string,
): Promise<CumulativeStats> {
    // 1. Total Pomodoro
    const { data: allSessions, error: sessionError } = await supabase
        .from("pomodoro_sessions")
        .select("total_work_time")
        .eq("user_id", userId);

    // 2. Total Video
    const { data: allVideos, error: videoError } = await supabase
        .from("video_progress")
        .select("video_id, video:videos(duration_minutes)")
        .eq("user_id", userId)
        .eq("completed", true);

    if (sessionError || videoError) {
        console.error(
            "Error fetching cumulative stats:",
            sessionError || videoError,
        );
    }

    const totalWorkSeconds =
        allSessions?.reduce((acc, s) => acc + (s.total_work_time || 0), 0) || 0;
    const totalWorkMinutes = Math.round(totalWorkSeconds / 60);

    let totalVideoMinutes = 0;
    if (allVideos) {
        totalVideoMinutes = allVideos.reduce((acc, vp) => {
            const duration =
                (vp.video as { duration_minutes?: number })?.duration_minutes ||
                0;
            return acc + duration;
        }, 0);
    }

    const ratio = totalVideoMinutes > 0
        ? Math.round((totalWorkMinutes / totalVideoMinutes) * 10) / 10
        : 0;

    return {
        totalWorkMinutes,
        totalVideoMinutes: Math.round(totalVideoMinutes),
        ratio,
    };
}

/**
 * Get historical statistics for the last N days.
 *
 * @param userId User ID
 * @param days Number of days to fetch (default: 7)
 * @returns Array of daily history stats
 */
export async function getHistoryStats(
    userId: string,
    days: number = 7,
): Promise<HistoryStats[]> {
    const now = new Date();
    const today = new Date(now);
    if (now.getHours() < 4) {
        today.setDate(today.getDate() - 1);
    }
    today.setHours(4, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(4, 0, 0, 0);

    // 1. Fetch Pomodoro Sessions
    const { data: sessions, error: sessionError } = await supabase
        .from("pomodoro_sessions")
        .select("started_at, total_work_time")
        .eq("user_id", userId)
        .gte("started_at", startDate.toISOString())
        .or("total_work_time.gte.60,total_break_time.gte.60");

    // 2. Fetch Video Progress
    const { data: videoProgress, error: videoError } = await supabase
        .from("video_progress")
        .select("completed_at, video_id, video:videos(duration_minutes)")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("completed_at", startDate.toISOString());

    if (sessionError || videoError) {
        console.error(
            "Error fetching history stats:",
            sessionError || videoError,
        );
        return [];
    }

    // Group by Date
    const statsMap: Record<string, { pomodoro: number; video: number }> = {};

    // Initialize with 0s for all days
    for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateKey = `${d.getFullYear()}-${
            String(d.getMonth() + 1).padStart(2, "0")
        }-${String(d.getDate()).padStart(2, "0")}`;
        statsMap[dateKey] = { pomodoro: 0, video: 0 };
    }

    (sessions as Database["public"]["Tables"]["pomodoro_sessions"]["Row"][])
        ?.forEach((s) => {
            const d = new Date(s.started_at);
            if (d.getHours() < 4) d.setDate(d.getDate() - 1);

            const dateKey = `${d.getFullYear()}-${
                String(d.getMonth() + 1).padStart(2, "0")
            }-${String(d.getDate()).padStart(2, "0")}`;
            if (statsMap[dateKey]) {
                statsMap[dateKey].pomodoro += s.total_work_time || 0;
            }
        });

    videoProgress?.forEach((vp) => {
        if (!vp.completed_at) return;
        const d = new Date(vp.completed_at);
        if (d.getHours() < 4) d.setDate(d.getDate() - 1);

        const dateKey = `${d.getFullYear()}-${
            String(d.getMonth() + 1).padStart(2, "0")
        }-${String(d.getDate()).padStart(2, "0")}`;

        if (statsMap[dateKey]) {
            const duration =
                (vp.video as { duration_minutes?: number })?.duration_minutes ||
                0;
            statsMap[dateKey].video += duration;
        }
    });

    return Object.entries(statsMap)
        .map(([date, values]) => ({
            date,
            pomodoro: Math.round(values.pomodoro / 60),
            video: Math.round(values.video),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get focus trend (work time) over the last 30 days.
 *
 * @param userId User ID
 * @returns Array of focus trend data
 */
export async function getFocusTrend(userId: string): Promise<FocusTrend[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString();

    const { data, error } = await supabase
        .from("pomodoro_sessions")
        .select("started_at, total_work_time")
        .eq("user_id", userId)
        .gte("started_at", dateStr)
        .order("started_at", { ascending: true });

    if (error || !data) return [];

    const dailyMap: Record<string, number> = {};

    data.forEach((s) => {
        const day = s.started_at.split("T")[0];
        dailyMap[day] = (dailyMap[day] || 0) + (s.total_work_time || 0);
    });

    return Object.entries(dailyMap).map(([date, seconds]) => ({
        date,
        minutes: Math.round(seconds / 60),
    })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get efficiency trend over the last 30 days.
 *
 * @param userId User ID
 * @returns Array of efficiency trend data
 */
export async function getEfficiencyTrend(
    userId: string,
): Promise<EfficiencyTrend[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString();

    const { data: sessions, error: sessionError } = await supabase
        .from("pomodoro_sessions")
        .select("started_at, total_work_time")
        .eq("user_id", userId)
        .gte("started_at", dateStr);

    const { data: videoProgress, error: videoError } = await supabase
        .from("video_progress")
        .select("completed_at, video:videos(duration_minutes)")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("completed_at", dateStr);

    if (sessionError || videoError) return [];

    const dailyMap: Record<
        string,
        { workSeconds: number; videoMinutes: number }
    > = {};

    sessions?.forEach((s) => {
        if (!s.started_at) return;
        const d = new Date(s.started_at);
        const day = getVirtualDateKey(d);
        if (!dailyMap[day]) dailyMap[day] = { workSeconds: 0, videoMinutes: 0 };
        dailyMap[day].workSeconds += Number(s.total_work_time || 0);
    });

    videoProgress?.forEach((vp) => {
        if (!vp.completed_at) return;
        const d = new Date(vp.completed_at);
        const day = getVirtualDateKey(d);

        const video = (Array.isArray(vp.video) ? vp.video[0] : vp.video) as {
            duration_minutes?: number;
        } | null;
        if (!video) return;

        const duration = video.duration_minutes || 0;

        if (!dailyMap[day]) dailyMap[day] = { workSeconds: 0, videoMinutes: 0 };
        dailyMap[day].videoMinutes += Number(duration);
    });

    return Object.entries(dailyMap)
        .map(([date, stats]) => {
            const workSeconds = stats.workSeconds;
            const videoMinutes = stats.videoMinutes;

            let multiplier = 0;
            if (workSeconds > 0) {
                multiplier = videoMinutes / (workSeconds / 60);
            }

            return {
                date,
                score: Number(multiplier.toFixed(2)),
                workMinutes: Math.round(workSeconds / 60),
                videoMinutes: Math.round(videoMinutes),
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get daily efficiency summary for the master card.
 *
 * @param userId User ID
 * @returns Daily efficiency summary
 */
export async function getDailyEfficiencySummary(
    userId: string,
): Promise<DailyEfficiencySummary> {
    const now = new Date();
    const today = new Date(now);

    // Virtual Day Logic: Day starts at 04:00 AM
    if (now.getHours() < 4) {
        today.setDate(today.getDate() - 1);
    }
    today.setHours(4, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todaySessions, error } = await supabase
        .from("pomodoro_sessions")
        .select(
            "id, course_name, started_at, total_work_time, total_break_time, total_pause_time, pause_count, efficiency_score, timeline",
        )
        .eq("user_id", userId)
        .gte("started_at", today.toISOString())
        .lt("started_at", tomorrow.toISOString())
        .or("total_work_time.gte.60,total_break_time.gte.60")
        .order("started_at", { ascending: true });

    if (error) {
        console.error("Error fetching daily efficiency summary:", error);
    }

    const sessionsData = todaySessions || [];

    // Calculate aggregates
    let totalWork = 0;
    let totalBreak = 0;
    let totalPause = 0;
    let totalPauseCount = 0;
    let totalCycles = 0;

    const detailedSessions: DetailedSession[] = sessionsData.map((s) => {
        const work = s.total_work_time || 0;
        const brk = s.total_break_time || 0;
        const pause = s.total_pause_time || 0;
        const eff = s.efficiency_score || 0;
        const pCount = s.pause_count || 0;

        totalWork += work;
        totalBreak += brk;
        totalPause += pause;
        totalPauseCount += pCount;

        totalCycles += getCycleCount(s.timeline);

        return {
            id: s.id,
            courseName: s.course_name || "Bilinmeyen Ders",
            workTimeSeconds: work,
            breakTimeSeconds: brk,
            pauseTimeSeconds: pause,
            efficiencyScore: eff,
            timeline: Array.isArray(s.timeline) ? (s.timeline as Json[]) : [],
            startedAt: s.started_at,
        };
    });

    // Calculate daily total Focus Power (Odak Gücü)
    const dailyFocusPower = calculateFocusPower(
        totalWork,
        totalBreak,
        totalPause,
    );

    return {
        efficiencyScore: dailyFocusPower,
        totalCycles,
        netWorkTimeSeconds: totalWork,
        totalBreakTimeSeconds: totalBreak,
        totalPauseTimeSeconds: totalPause,
        pauseCount: totalPauseCount,
        sessions: detailedSessions,
    };
}

/**
 * Get course mastery scores.
 *
 * @param userId User ID
 * @returns Array of course mastery data
 */
export async function getCourseMastery(
    userId: string,
): Promise<CourseMastery[]> {
    // 1. Get all courses
    const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id, name, total_videos");

    if (coursesError || !courses) return [];

    // 2. Get video progress counts per course
    const { data: vProgress } = await supabase
        .from("video_progress")
        .select("video:videos(course_id)")
        .eq("user_id", userId)
        .eq("completed", true);

    const vCompletedMap: Record<string, number> = {};
    if (vProgress) {
        vProgress.forEach(
            (p: { video: { course_id: string | null } | null }) => {
                const courseId = p.video?.course_id;
                if (courseId) {
                    vCompletedMap[courseId] = (vCompletedMap[courseId] || 0) +
                        1;
                }
            },
        );
    }

    // 3. Get total questions count per course
    const { data: qCounts } = await supabase
        .from("questions")
        .select("course_id");

    const qTotalMap: Record<string, number> = {};
    if (qCounts) {
        qCounts.forEach((q) => {
            qTotalMap[q.course_id] = (qTotalMap[q.course_id] || 0) + 1;
        });
    }

    // 4. Get solved questions count per course
    const { data: solvedQs } = await supabase
        .from("user_quiz_progress")
        .select("course_id")
        .eq("user_id", userId);

    const qSolvedMap: Record<string, number> = {};
    if (solvedQs) {
        solvedQs.forEach((s) => {
            qSolvedMap[s.course_id] = (qSolvedMap[s.course_id] || 0) + 1;
        });
    }

    // 5. Calculate Mastery
    return courses.map((c) => {
        const totalVideos = c.total_videos || 0;
        const completedVideos = vCompletedMap[c.id] || 0;
        const totalQuestions = qTotalMap[c.id] || 200;
        const solvedQuestions = qSolvedMap[c.id] || 0;

        const videoRatio = totalVideos > 0
            ? (completedVideos / totalVideos)
            : 0;
        const questRatio = totalQuestions > 0
            ? (solvedQuestions / totalQuestions)
            : 0;

        // Use 60% video, 40% question weight
        const mastery = Math.round(
            (videoRatio * 60) + (Math.min(1, questRatio) * 40),
        );

        return {
            courseId: c.id,
            courseName: c.name,
            videoProgress: Math.round(videoRatio * 100),
            questionProgress: Math.round(Math.min(1, questRatio) * 100),
            masteryScore: mastery,
        };
    }).sort((a, b) => b.masteryScore - a.masteryScore);
}
