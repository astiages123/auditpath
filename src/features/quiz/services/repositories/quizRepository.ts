/**
 * Quiz Repository (Data Access Layer)
 *
 * Centralizes all Supabase interactions for the Quiz feature.
 * Strictly typed and separated from business logic.
 *
 * REFACTORED: Major functions moved to modular files.
 */

import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";
import { type Database, type Json } from "@/types/database.types";
import { addToOfflineQueue } from "@/lib/offlineQueueService";

const quizLogger = logger.withPrefix("[QuizRepository]");

// --- Re-exports ---

export * from "./quizSessionRepository";
export * from "./quizQuestionRepository";
export * from "./quizProgressRepository";
export * from "./quizMetadataRepository";

// --- Helper Functions (Local) ---

/**
 * Generic helper for Supabase queries with error handling and offline queue support.
 */
async function safeQuery<T = unknown>(
  queryPromise: PromiseLike<{ data: T | null; error: unknown }>,
  errorMessage: string,
  context?: Record<string, unknown>,
  offlinePayload?: Record<string, unknown>,
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await queryPromise;

    if (error) {
      quizLogger.error(errorMessage, { ...context, error });
      if (offlinePayload) {
        addToOfflineQueue(offlinePayload);
      }
      const msg = (error as { message?: string })?.message || "Query error";
      return {
        data: null,
        error: new Error(msg),
      };
    }

    return { data, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    quizLogger.error(`Unexpected error: ${errorMessage}`, {
      ...context,
      error,
    });
    if (offlinePayload) {
      addToOfflineQueue(offlinePayload);
    }
    return { data: null, error };
  }
}

// --- Remaining Functions ---

export async function getCourseName(courseId: string): Promise<string | null> {
  const { data } = await safeQuery<{ name: string }>(
    supabase
      .from("courses")
      .select("name")
      .eq("id", courseId)
      .single(),
    "getCourseName error",
    { courseId },
  );
  return data?.name || null;
}

export async function getCurrentSessionToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    quizLogger.error("Auth session error", error);
    return null;
  }
  return data.session?.access_token || null;
}

export async function getTotalQuestionsInCourse(
  courseId: string,
): Promise<number> {
  const { count } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);
  return count || 0;
}

export async function getArchivedQuestionsCount(
  userId: string,
  courseId: string,
): Promise<number> {
  const { count } = await supabase
    .from("user_question_status")
    .select("id, questions!inner(course_id)", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .eq("status", "archived")
    .eq("questions.course_id", courseId);
  return count || 0;
}

export async function getChunkQuestionCount(chunkId: string): Promise<number> {
  const { count } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("chunk_id", chunkId);
  return count || 10;
}

export async function getSolvedQuestionIds(
  userId: string,
  chunkId: string,
): Promise<Set<string>> {
  const { data } = await safeQuery<{ question_id: string }[]>(
    supabase
      .from("user_quiz_progress")
      .select("question_id")
      .eq("user_id", userId)
      .eq("chunk_id", chunkId),
    "getSolvedQuestionIds error",
    { userId, chunkId },
  );

  return new Set(data?.map((s) => s.question_id) || []);
}

export async function getUniqueSolvedCountInChunk(
  userId: string,
  chunkId: string,
): Promise<number> {
  const { count } = await supabase
    .from("user_question_status")
    .select("question_id, questions!inner(chunk_id)", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .eq("questions.chunk_id", chunkId)
    .in("status", ["archived", "pending_followup"]);
  return count || 0;
}

export async function getFrontierChunkId(
  userId: string,
  courseId: string,
): Promise<string | null> {
  const { data } = await safeQuery<{ chunk_id: string }>(
    supabase
      .from("chunk_mastery")
      .select("chunk_id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "getFrontierChunkId error",
    { userId, courseId },
  );

  return data?.chunk_id || null;
}

export async function getRecentDiagnoses(
  userId: string,
  chunkId: string,
  limit: number,
): Promise<string[]> {
  const { data } = await safeQuery<{ ai_diagnosis: string | null }[]>(
    supabase
      .from("user_quiz_progress")
      .select("ai_diagnosis")
      .eq("user_id", userId)
      .eq("chunk_id", chunkId)
      .not("ai_diagnosis", "is", null)
      .order("answered_at", { ascending: false })
      .limit(limit),
    "getRecentDiagnoses error",
    { userId, chunkId },
  );

  return (data || [])
    .map((p) => p.ai_diagnosis)
    .filter((d): d is string => Boolean(d));
}

export async function getCourseStatsAggregate(
  userId: string,
  courseId: string,
) {
  const { data: masteryData } = await safeQuery<
    { total_questions_seen: number | null; mastery_score: number }[]
  >(
    supabase
      .from("chunk_mastery")
      .select("total_questions_seen, mastery_score")
      .eq("user_id", userId)
      .eq("course_id", courseId),
    "getCourseStatsAggregate error",
    { userId, courseId },
  );
  return masteryData;
}

export async function fetchCourseChunks(courseId: string) {
  const { data } = await safeQuery<
    { id: string; metadata: Json; content: string }[]
  >(
    supabase
      .from("note_chunks")
      .select("id, metadata, content")
      .eq("course_id", courseId)
      .eq("status", "COMPLETED"),
    "fetchCourseChunks error",
    { courseId },
  );
  return data || [];
}

export async function fetchCourseMastery(courseId: string, userId: string) {
  const { data } = await safeQuery<
    { chunk_id: string; mastery_score: number }[]
  >(
    supabase
      .from("chunk_mastery")
      .select("chunk_id, mastery_score")
      .eq("course_id", courseId)
      .eq("user_id", userId),
    "fetchCourseMastery error",
    { courseId, userId },
  );
  return data || [];
}

export async function fetchPrerequisiteQuestions(
  courseId: string,
  concepts: string[],
  limit: number,
) {
  const { data } = await safeQuery<
    {
      id: string;
      chunk_id: string | null;
      concept_title: string | null;
      bloom_level: string | null;
    }[]
  >(
    supabase
      .from("questions")
      .select("id, chunk_id, concept_title, bloom_level")
      .eq("course_id", courseId)
      .in("concept_title", concepts)
      .limit(limit),
    "fetchPrerequisiteQuestions error",
    { courseId, concepts },
  );
  return data || [];
}

export async function fetchGeneratedQuestions(
  chunkId: string,
  usageType: Database["public"]["Enums"]["question_usage_type"],
  limit: number,
) {
  const { data } = await safeQuery<{ id: string }[]>(
    supabase
      .from("questions")
      .select("id")
      .eq("chunk_id", chunkId)
      .eq("usage_type", usageType)
      .order("created_at", { ascending: false })
      .limit(limit),
    "fetchGeneratedQuestions error",
    { chunkId, usageType },
  );
  return data || [];
}

export async function updateChunkMetadata(
  chunkId: string,
  metadata: Json,
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await safeQuery<null>(
    supabase
      .from("note_chunks")
      .update({ metadata })
      .eq("id", chunkId),
    "updateChunkMetadata error",
    { chunkId },
  );

  if (error) return { success: false, error };
  return { success: true };
}

export async function createQuestion(
  payload: Database["public"]["Tables"]["questions"]["Insert"],
): Promise<{ success: boolean; id?: string; error?: Error }> {
  const { data, error } = await safeQuery<{ id: string }>(
    supabase
      .from("questions")
      .insert(payload)
      .select("id")
      .single(),
    "createQuestion error",
    { chunkId: payload.chunk_id },
    payload as Record<string, unknown>, // offline payload
  );

  if (error) return { success: false, error };
  return { success: true, id: data?.id };
}

export async function createQuestions(
  payloads: Database["public"]["Tables"]["questions"]["Insert"][],
): Promise<{ success: boolean; ids?: string[]; error?: Error }> {
  const { data, error } = await safeQuery<{ id: string }[]>(
    supabase
      .from("questions")
      .insert(payloads)
      .select("id"),
    "createQuestions error",
    { count: payloads.length },
    { payloads, _type: "bulk_create_questions" }, // offline payload
  );

  if (error) return { success: false, error };
  return { success: true, ids: data?.map((d) => d.id) || [] };
}
