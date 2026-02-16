/**
 * Quiz Question Repository (Data Access Layer)
 *
 * Handles fetching questions, waterfal logic, and question details.
 */

import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";
import { type Database, type Json } from "@/types/database.types";
import { parseArray } from "@/utils/helpers";
import { z } from "zod";
import {
  FollowUpQuestionRowSchema,
  QuestionWithStatusRowSchema,
} from "@/features/quiz/types";
import { MASTERY_THRESHOLD } from "@/utils/constants";
import { safeQuery } from "@/lib/supabaseHelpers";

const quizLogger = logger.withPrefix("[QuizQuestionRepository]");

// --- Types ---

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

export interface QuestionWithStatus {
  question_id: string;
  status: Database["public"]["Enums"]["question_status"];
  next_review_session: number | null;
  questions: Pick<
    QuestionRow,
    "id" | "chunk_id" | "course_id" | "parent_question_id" | "question_data"
  >;
}

export interface FollowUpQuestionRow {
  id: string;
  chunk_id: string | null;
  course_id: string;
  parent_question_id: string | null;
  question_data: Json;
  user_question_status: { status: string }[];
}

const PartialQuestionRowSchema = z.object({
  id: z.string(),
  chunk_id: z.string(),
  question_data: z.unknown(), // Could use QuizQuestionSchema if strictly typed in DB
  bloom_level: z.string().nullable(),
  concept_title: z.string().nullable(),
  usage_type: z.string().nullable(),
});

// --- Helper Functions ---

/**
 * Helper: Fetches active questions for a user in a specific chunk.
 */
async function fetchActiveQuestionsFromChunk(
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
async function fetchNullQuestionsFromChunk(
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

  return (data || []).map((q: unknown) => {
    const item = q as {
      id: string;
      chunk_id: string;
      course_id: string;
      parent_question_id: string | null;
      question_data: Json;
    };
    return {
      question_id: item.id,
      status: "active" as Database["public"]["Enums"]["question_status"],
      next_review_session: null,
      questions: {
        id: item.id,
        chunk_id: item.chunk_id,
        course_id: item.course_id,
        parent_question_id: item.parent_question_id,
        question_data: item.question_data,
      },
    };
  });
}

// --- Question Fetching ---

export async function fetchQuestionsByChunk(
  chunkId: string,
  limit: number,
  excludeIds: Set<string>,
): Promise<z.infer<typeof PartialQuestionRowSchema>[]> {
  const { data } = await safeQuery<unknown[]>(
    supabase
      .from("questions")
      .select(
        "id, chunk_id, question_data, bloom_level, concept_title, usage_type",
      )
      .eq("chunk_id", chunkId)
      .limit(limit + excludeIds.size),
    "fetchQuestionsByChunk error",
    { chunkId },
  );

  if (!data) return [];

  // Safe parse using helper
  const parsed = parseArray(PartialQuestionRowSchema, data, {
    onError: (err, idx) =>
      quizLogger.warn(`Invalid question row at index ${idx}`, {
        error: err,
      }),
  });

  return parsed.filter((q) => !excludeIds.has(q.id)).slice(0, limit);
}

export async function fetchQuestionsByStatus(
  userId: string,
  courseId: string,
  status: "pending_followup" | "active" | "archived",
  maxSession: number | null,
  limit: number,
): Promise<QuestionWithStatus[]> {
  let query = supabase
    .from("user_question_status")
    .select(
      `
            question_id, status, next_review_session,
            questions!inner (id, chunk_id, course_id, parent_question_id, question_data)
        `,
    )
    .eq("user_id", userId)
    .eq("questions.course_id", courseId)
    .eq("status", status)
    .eq("questions.usage_type", "antrenman");

  if (maxSession !== null) {
    query = query.lte("next_review_session", maxSession);
  }

  query = query.order("updated_at", { ascending: true }).limit(limit);

  const { data } = await safeQuery<unknown[]>(
    query,
    "fetchQuestionsByStatus error",
    { userId, courseId, status },
  );

  return parseArray(QuestionWithStatusRowSchema, data || [], {
    onError: (err, idx) =>
      quizLogger.warn(`Invalid question status row at index ${idx}`, {
        error: err,
      }),
  }) as QuestionWithStatus[];
}

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
    // 1. Get questions where status is 'active'
    const activeQuestions = await fetchActiveQuestionsFromChunk(
      userId,
      chunkId,
      currentLimit,
    );

    // 2. Get questions where status is NULL (not seen yet)
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

  // Phase 1: User's Intended (Target) Chunk
  const targetResults = await getFromChunk(targetChunkId, limit);
  results.push(...targetResults);

  if (results.length >= limit) return results.slice(0, limit);

  // Phase 2: Waterfall from other weak chunks (< MASTERY_THRESHOLD% mastery, ordered by updated_at)
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

type QuestionFetchResult = (
  & Pick<
    QuestionRow,
    "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
  >
  & {
    course?: { course_slug: string } | null;
    chunk?: { section_title: string } | null;
  }
)[];

export async function fetchQuestionsByIds(
  ids: string[],
): Promise<QuestionFetchResult> {
  if (ids.length === 0) return [];
  const { data } = await safeQuery<QuestionFetchResult>(
    supabase
      .from("questions")
      .select(
        "id, chunk_id, question_data, bloom_level, concept_title, usage_type, course:courses(course_slug), chunk:note_chunks(section_title)",
      )
      .in("id", ids),
    "fetchQuestionsByIds error",
    { ids },
  );

  return (data as QuestionFetchResult) || [];
}

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

export async function getQuestionData(
  questionId: string,
): Promise<
  Pick<
    QuestionRow,
    "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
  > | null
> {
  const { data } = await safeQuery<
    Pick<
      QuestionRow,
      "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
    >
  >(
    supabase
      .from("questions")
      .select(
        "id, chunk_id, question_data, bloom_level, concept_title, usage_type",
      )
      .eq("id", questionId)
      .single(),
    "getQuestionData error",
    { questionId },
  );
  return data as
    | Pick<
      QuestionRow,
      | "id"
      | "chunk_id"
      | "question_data"
      | "bloom_level"
      | "concept_title"
      | "usage_type"
    >
    | null;
}

export async function fetchCachedQuestion(
  chunkId: string,
  usageType: Database["public"]["Enums"]["question_usage_type"],
  conceptTitle: string,
): Promise<
  Pick<
    QuestionRow,
    "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
  > | null
> {
  const { data } = await safeQuery<
    Pick<
      QuestionRow,
      "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
    >
  >(
    supabase
      .from("questions")
      .select("id, chunk_id, question_data, bloom_level, concept_title")
      .eq("chunk_id", chunkId)
      .ilike("concept_title", conceptTitle.trim())
      .eq("usage_type", usageType)
      .maybeSingle(),
    "fetchCachedQuestion error",
    { chunkId, usageType, conceptTitle },
  );
  return data as
    | Pick<
      QuestionRow,
      "id" | "chunk_id" | "question_data" | "bloom_level" | "concept_title"
    >
    | null;
}

export async function getAntrenmanQuestionCount(
  chunkId: string,
): Promise<number> {
  const { count } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("chunk_id", chunkId)
    .eq("usage_type", "antrenman");
  return count || 0;
}
