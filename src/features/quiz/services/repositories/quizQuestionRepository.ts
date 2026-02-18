import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";
import { type Database, type Json } from "@/types/database.types";
import { parseArray } from "@/utils/helpers";
import { z } from "zod";
import { QuestionWithStatusRowSchema } from "@/features/quiz/types";
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

export interface RepositoryQuestion {
  id: string;
  chunk_id: string | null;
  question_data: Json;
  bloom_level: string | null;
  concept_title: string | null;
  usage_type: string | null;
  course?: { course_slug: string } | null;
  chunk?: { section_title: string } | null;
}

const PartialQuestionRowSchema = z.object({
  id: z.string(),
  chunk_id: z.string(),
  question_data: z.unknown(),
  bloom_level: z.string().nullable(),
  concept_title: z.string().nullable(),
  usage_type: z.string().nullable(),
});

/**
 * Basic question fetching by chunk.
 */
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

  const parsed = parseArray(PartialQuestionRowSchema, data, {
    onError: (err, idx) =>
      quizLogger.warn(`Invalid question row at index ${idx}`, { error: err }),
  });

  return parsed.filter((q) => !excludeIds.has(q.id)).slice(0, limit);
}

/**
 * Fetch questions by their specific review status.
 */
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
      `question_id, status, next_review_session, questions!inner (id, chunk_id, course_id, parent_question_id, question_data)`,
    )
    .eq("user_id", userId)
    .eq("questions.course_id", courseId)
    .eq("status", status)
    .eq("questions.usage_type", "antrenman");

  if (maxSession !== null) query = query.lte("next_review_session", maxSession);

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

// Using explicit any for Supabase queries - required for dynamic query builders
export async function fetchQuestionsByIds(
  ids: string[],
): Promise<RepositoryQuestion[]> {
  if (ids.length === 0) return [];
  const { data } = await safeQuery<RepositoryQuestion[]>(
    supabase
      .from("questions")
      .select(
        "id, chunk_id, question_data, bloom_level, concept_title, usage_type, course:courses(course_slug), chunk:note_chunks(section_title)",
      )
      .in("id", ids),
    "fetchQuestionsByIds error",
    { ids },
  );
  return data || [];
}

export async function getQuestionData(
  questionId: string,
): Promise<RepositoryQuestion | null> {
  const { data } = await safeQuery<RepositoryQuestion>(
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
  return data;
}

export async function fetchCachedQuestion(
  chunkId: string,
  usageType: string,
  conceptTitle: string,
): Promise<RepositoryQuestion | null> {
  const { data } = await safeQuery<RepositoryQuestion>(
    supabase
      .from("questions")
      .select("id, chunk_id, question_data, bloom_level, concept_title")
      .eq("chunk_id", chunkId)
      .ilike("concept_title", conceptTitle.trim())
      // @ts-expect-error - Supabase type inference issue
      .eq("usage_type", usageType)
      .maybeSingle(),
    "fetchCachedQuestion error",
    { chunkId, usageType, conceptTitle },
  );
  return data;
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

// Re-export specialized repositories
export * from "./trainingRepository";
export * from "./followupRepository";
