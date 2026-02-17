import { supabase } from "@/lib/supabase";
import { parseArray } from "@/utils/helpers";
import { QuestionWithStatusRowSchema } from "@/features/quiz/types";
import { MASTERY_THRESHOLD } from "@/utils/constants";
import { safeQuery } from "@/lib/supabaseHelpers";
import { type QuestionWithStatus } from "./quizQuestionRepository";

/**
 * Helper: Fetches active questions for a user in a specific chunk.
 */
export async function fetchActiveQuestionsFromChunk(
  userId: string,
  chunkId: string,
  limit: number,
): Promise<QuestionWithStatus[]> {
  const { data } = await safeQuery<unknown[]>(
    supabase
      .from("user_question_status")
      .select(
        `
          question_id, status, next_review_session,
          questions!inner (id, chunk_id, course_id, parent_question_id, question_data)
        `,
      )
      .eq("user_id", userId)
      .eq("questions.chunk_id", chunkId)
      .eq("status", "active")
      .eq("questions.usage_type", "antrenman")
      .limit(limit),
    "fetchActiveQuestionsFromChunk error",
    { userId, chunkId },
  );

  return parseArray(
    QuestionWithStatusRowSchema,
    data || [],
  ) as QuestionWithStatus[];
}

/**
 * Helper: Fetches questions that have NO status (null) for a user in a specific chunk.
 */
export async function fetchNullQuestionsFromChunk(
  chunkId: string,
  limit: number,
): Promise<QuestionWithStatus[]> {
  const { data } = await safeQuery<unknown[]>(
    supabase
      .from("questions")
      .select(
        `
          id, chunk_id, course_id, parent_question_id, question_data,
          user_question_status!left (id)
        `,
      )
      .eq("chunk_id", chunkId)
      .eq("usage_type", "antrenman")
      .is("user_question_status.id", null)
      .limit(limit),
    "fetchNullQuestionsFromChunk error",
    { chunkId },
  );

  const typedData = (data || []) as {
    id: string;
    chunk_id: string;
    course_id: string;
    parent_question_id: string | null;
    question_data: unknown;
  }[];

  return typedData.map((q) => ({
    question_id: q.id,
    status: "active",
    next_review_session: null,
    questions: {
      id: q.id,
      chunk_id: q.chunk_id,
      course_id: q.course_id,
      parent_question_id: q.parent_question_id,
      question_data: q
        .question_data as QuestionWithStatus["questions"]["question_data"],
    },
  })) as QuestionWithStatus[];
}

/**
 * Main waterfall fetcher for training mode.
 */
export async function fetchWaterfallTrainingQuestions(
  userId: string,
  courseId: string,
  targetChunkId: string,
  limit: number,
): Promise<QuestionWithStatus[]> {
  const results: QuestionWithStatus[] = [];

  const getFromChunk = async (
    chunkId: string,
    currentLimit: number,
  ): Promise<QuestionWithStatus[]> => {
    const activeQuestions = await fetchActiveQuestionsFromChunk(
      userId,
      chunkId,
      currentLimit,
    );
    const remainingLimit = currentLimit - activeQuestions.length;
    let nullQuestions: QuestionWithStatus[] = [];

    if (remainingLimit > 0) {
      nullQuestions = await fetchNullQuestionsFromChunk(
        chunkId,
        remainingLimit,
      );
    }

    return [...activeQuestions, ...nullQuestions];
  };

  const targetResults = await getFromChunk(targetChunkId, limit);
  results.push(...targetResults);

  if (results.length >= limit) return results.slice(0, limit);

  const { data: weakChunks } = await safeQuery<{ chunk_id: string }[]>(
    supabase
      .from("chunk_mastery")
      .select("chunk_id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .neq("chunk_id", targetChunkId)
      .lt("mastery_score", MASTERY_THRESHOLD)
      .order("updated_at", { ascending: false }),
    "fetchWaterfallTrainingQuestions weakChunks error",
    { userId, courseId },
  );

  if (weakChunks) {
    for (const chunk of weakChunks) {
      const remaining = limit - results.length;
      if (remaining <= 0) break;
      const chunkResults = await getFromChunk(chunk.chunk_id, remaining);
      results.push(...chunkResults);
    }
  }

  return results.slice(0, limit);
}
