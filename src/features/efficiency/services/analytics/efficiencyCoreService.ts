import { supabase } from "@/lib/supabase";
import { calculateEfficiencyScore } from "../../logic/efficiencyHelpers";
import { getVirtualDayStart } from "@/utils/helpers";
import { logger } from "@/utils/logger";
import type { EfficiencyData } from "@/features/efficiency/types/efficiencyTypes";

/**
 * Get efficiency ratio (video time vs pomodoro time).
 *
 * @param userId User ID
 * @returns Efficiency data
 */
export async function getEfficiencyRatio(
    userId: string,
): Promise<EfficiencyData> {
    const today = getVirtualDayStart();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Fetch Today's Pomodoro Stats (Optimized Selection)
    const { data: todaySessions, error: sessionError } = await supabase
        .from("pomodoro_sessions")
        .select("total_work_time, started_at, ended_at")
        .eq("user_id", userId)
        .gte("started_at", today.toISOString())
        .lt("started_at", tomorrow.toISOString())
        .or("total_work_time.gte.60,total_break_time.gte.60");

    // 2. Fetch Today's Video Stats (Optimized Selection)
    const { data: todayVideos, error: videoError } = await supabase
        .from("video_progress")
        .select("completed_at, video:videos(duration_minutes)")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("completed_at", today.toISOString())
        .lt("completed_at", tomorrow.toISOString());

    // 3. Fetch Today's Quiz Progress (Optimized Selection)
    const { data: todayQuiz } = await supabase
        .from("user_quiz_progress")
        .select("answered_at")
        .eq("user_id", userId)
        .gte("answered_at", today.toISOString())
        .lt("answered_at", tomorrow.toISOString());

    if (sessionError || videoError) {
        logger.error("Error fetching efficiency metrics:", {
            sessionError: sessionError?.message,
            videoError: videoError?.message,
        });
    }

    const sessions = todaySessions || [];

    // Calculate total work time
    const totalWork =
        sessions.reduce((acc, s) => acc + (s.total_work_time || 0), 0) || 0;

    // Calculate total video minutes
    let totalVideoMinutes = 0;
    if (todayVideos) {
        totalVideoMinutes = todayVideos.reduce((acc, vp) => {
            const video = vp.video as { duration_minutes?: number } | null;
            return acc + (video?.duration_minutes || 0);
        }, 0);
    }

    // Quiz Filtering Logic - Optimized with specific checks instead of heavy filtering inside loop if possible
    let quizSessionMinutes = 0;

    if (todayQuiz && todayQuiz.length > 0 && sessions.length > 0) {
        const quizTimestamps = todayQuiz
            .map((q) => q.answered_at ? new Date(q.answered_at).getTime() : 0)
            .filter((t) => t > 0)
            .sort((a, b) => a - b);

        // Optimization: If no quizzes, skip
        if (quizTimestamps.length > 0) {
            sessions.forEach((session) => {
                const start = new Date(session.started_at).getTime();
                // Estimate end if not present (fallback logic preserved)
                const end = session.ended_at
                    ? new Date(session.ended_at).getTime()
                    : start + ((session.total_work_time || 0) * 1000); // Only adding work time as approximation if needed

                // Count quizzes in this range (Binary search could be O(log M) but linear scan on small daily array is fine)
                let questionsInSession = 0;
                for (const t of quizTimestamps) {
                    if (t >= start && t <= end) questionsInSession++;
                }

                // Count videos in this range
                let videosInSession = 0;
                if (todayVideos) {
                    for (const v of todayVideos) {
                        if (!v.completed_at) continue;
                        const t = new Date(v.completed_at).getTime();
                        if (t >= start && t <= end) videosInSession++;
                    }
                }

                if (questionsInSession >= 5 && videosInSession === 0) {
                    quizSessionMinutes += Math.round(
                        (session.total_work_time || 0) / 60,
                    );
                }
            });
        }
    }

    const totalWorkMinutes = Math.round(totalWork / 60);

    const effectiveWorkMinutes = Math.max(
        totalVideoMinutes,
        totalWorkMinutes - quizSessionMinutes,
    );

    const ratio = effectiveWorkMinutes > 0
        ? Math.round((totalVideoMinutes / effectiveWorkMinutes) * 10) / 10
        : 0.0;

    const efficiencyScore = calculateEfficiencyScore(
        totalVideoMinutes,
        effectiveWorkMinutes,
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
