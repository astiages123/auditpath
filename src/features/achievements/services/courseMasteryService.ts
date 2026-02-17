import { supabase } from "@/lib/supabase";
import type { CourseMastery } from "@/features/courses/types/courseTypes";

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
    return courses
        .map((c) => {
            const totalVideos = c.total_videos || 0;
            const completedVideos = vCompletedMap[c.id] || 0;
            const totalQuestions = qTotalMap[c.id] || 200;
            const solvedQuestions = qSolvedMap[c.id] || 0;

            const videoRatio = totalVideos > 0
                ? completedVideos / totalVideos
                : 0;
            const questRatio = totalQuestions > 0
                ? solvedQuestions / totalQuestions
                : 0;

            // Use 60% video, 40% question weight
            const mastery = Math.round(
                videoRatio * 60 + Math.min(1, questRatio) * 40,
            );

            return {
                courseId: c.id,
                courseName: c.name,
                videoProgress: Math.round(videoRatio * 100),
                questionProgress: Math.round(Math.min(1, questRatio) * 100),
                masteryScore: mastery,
            };
        })
        .sort((a, b) => b.masteryScore - a.masteryScore);
}
