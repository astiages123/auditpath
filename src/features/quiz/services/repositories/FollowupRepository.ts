import { supabase } from "@/lib/supabase";
import { parseArray } from "@/utils/helpers";
import { FollowUpQuestionRowSchema } from "@/features/quiz/types";
import { safeQuery } from "@/lib/supabaseHelpers";
import { type FollowUpQuestionRow } from "./quizQuestionRepository";

/**
 * Fetches new follow-up questions that hasn't been status-tracked yet.
 */
export async function fetchNewFollowups(
    courseId: string,
    limit: number,
): Promise<FollowUpQuestionRow[]> {
    const { data } = await safeQuery<unknown[]>(
        supabase
            .from("questions")
            .select(
                `
          id, chunk_id, course_id, parent_question_id, question_data,
          user_question_status!left (status)
        `,
            )
            .eq("course_id", courseId)
            .eq("usage_type", "antrenman")
            .not("parent_question_id", "is", null)
            .or(`status.is.null`, { foreignTable: "user_question_status" })
            .limit(limit),
        "fetchNewFollowups error",
        { courseId },
    );

    return parseArray(
        FollowUpQuestionRowSchema,
        data || [],
    ) as FollowUpQuestionRow[];
}
