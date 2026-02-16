import { supabase } from "@/lib/supabase";
import type { RecentActivity } from "@/types";
import { logger } from "@/utils/logger";

interface PomodoroSessionRow {
    id: string;
    started_at: string;
    course_name: string | null;
    total_work_time: number | null;
}

interface VideoProgressRow {
    id: string;
    completed_at: string | null;
    video: { title: string } | null;
}

interface QuizProgressRow {
    id: string;
    answered_at: string | null;
    course: { name: string } | null;
}

/**
 * Get recent activities across all types.
 *
 * @param userId User ID
 * @param limit Maximum number of activities to return (default: 10)
 * @returns Array of unified activity objects
 */
export async function getRecentActivities(
    userId: string,
    limit: number = 10,
): Promise<RecentActivity[]> {
    try {
        const [pomodoro, video, quiz] = await Promise.all([
            supabase
                .from("pomodoro_sessions")
                .select("id, course_name, started_at, total_work_time")
                .eq("user_id", userId)
                .order("started_at", { ascending: false })
                .limit(limit),
            supabase
                .from("video_progress")
                .select("id, completed_at, video:videos(title)")
                .eq("user_id", userId)
                .eq("completed", true)
                .order("completed_at", { ascending: false })
                .limit(limit),
            supabase
                .from("user_quiz_progress")
                .select("id, answered_at, course:courses(name)")
                .eq("user_id", userId)
                .order("answered_at", { ascending: false })
                .limit(limit),
        ]);

        const activities: RecentActivity[] = [
            ...(pomodoro.data || []).map((s: PomodoroSessionRow) => ({
                id: s.id,
                type: "pomodoro" as const,
                date: s.started_at,
                title: s.course_name || "Odaklanma Seansı",
                durationMinutes: Math.round((s.total_work_time || 0) / 60),
            })),
            ...(video.data || []).map((v: VideoProgressRow) => ({
                id: v.id,
                type: "video" as const,
                date: v.completed_at || new Date().toISOString(),
                title: v.video?.title || "Video İzleme",
            })),
            ...(quiz.data || []).map((q: QuizProgressRow) => ({
                id: q.id,
                type: "quiz" as const,
                date: q.answered_at || new Date().toISOString(),
                title: q.course?.name || "Konu Testi",
            })),
        ];

        return activities
            .sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .slice(0, limit);
    } catch (err) {
        logger.error("Error fetching recent activities:", err as Error);
        return [];
    }
}
