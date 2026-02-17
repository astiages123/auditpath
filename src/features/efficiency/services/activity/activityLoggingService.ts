import { supabase } from "@/lib/supabase";
import type {
    PomodoroInsert,
    VideoUpsert,
} from "@/features/pomodoro/types/pomodoroTypes";
import { type QuizInsert } from "@/features/quiz/types/quizTypes";
import type { Database } from "@/types/database.types";
import { logger } from "@/utils/logger";

/**
 * Activity data union type for different activity types
 */
type ActivityData = PomodoroInsert | VideoUpsert | QuizInsert;

/**
 * Log a new activity (pomodoro, video, or quiz).
 *
 * @param userId User ID
 * @param type Activity type
 * @param data Activity data
 * @returns true if successful, false otherwise
 */
export async function logActivity(
    userId: string,
    type: "pomodoro" | "video" | "quiz",
    data: ActivityData,
): Promise<boolean> {
    try {
        let result;
        if (type === "pomodoro") {
            const pomodoroData = data as PomodoroInsert;
            const insertData:
                Database["public"]["Tables"]["pomodoro_sessions"]["Insert"] = {
                    user_id: userId,
                    course_id: pomodoroData.course_id,
                    course_name: pomodoroData.course_name,
                    started_at: pomodoroData.started_at,
                    ended_at: pomodoroData.ended_at || new Date().toISOString(),
                    timeline: pomodoroData.timeline,
                    total_work_time: pomodoroData.total_work_time,
                    total_break_time: pomodoroData.total_break_time,
                    total_pause_time: pomodoroData.total_pause_time,
                };
            result = await supabase.from("pomodoro_sessions").insert(
                insertData,
            );
        } else if (type === "video") {
            const videoData = data as VideoUpsert;
            const insertData:
                Database["public"]["Tables"]["video_progress"]["Insert"] = {
                    user_id: userId,
                    video_id: videoData.video_id,
                    completed: videoData.completed,
                    completed_at: videoData.completed_at,
                };
            result = await supabase.from("video_progress").upsert(insertData);
        } else {
            const quizData = data as QuizInsert;
            const insertData:
                Database["public"]["Tables"]["user_quiz_progress"]["Insert"] = {
                    user_id: userId,
                    course_id: quizData.course_id,
                    question_id: quizData.question_id,
                    chunk_id: quizData.chunk_id || null,
                    response_type: quizData.response_type,
                    session_number: quizData.session_number,
                    ai_diagnosis: quizData.ai_diagnosis || null,
                    ai_insight: quizData.ai_insight || null,
                };
            result = await supabase.from("user_quiz_progress").insert(
                insertData,
            );
        }

        if (result.error) throw result.error;
        return true;
    } catch (err) {
        logger.error(`Error logging ${type} activity:`, err as Error);
        return false;
    }
}
