/**
 * Quiz Progress Repository (Data Access Layer)
 *
 * Handles progress tracking, mastery scores, and user status.
 */

import { supabase } from "@/lib/supabase";
import { type Database } from "@/types/database.types";
import { type ChunkMasteryRow } from "@/features/quiz/types/quizTypes";
import { safeQuery } from "@/lib/supabaseHelpers";

// --- Types ---

export interface UserQuestionStatusRow {
  question_id: string;
  status: Database["public"]["Enums"]["question_status"];
  consecutive_success: number;
  consecutive_fails: number;
  next_review_session: number | null;
}

// --- Progress & State ---

export async function getUserQuestionStatus(
  userId: string,
  questionId: string,
): Promise<UserQuestionStatusRow | null> {
  const { data } = await safeQuery<UserQuestionStatusRow>(
    supabase
      .from("user_question_status")
      .select(
        "question_id, status, consecutive_success, consecutive_fails, next_review_session",
      )
      .eq("user_id", userId)
      .eq("question_id", questionId)
      .maybeSingle(),
    "getUserQuestionStatus error",
    { userId, questionId },
  );

  if (!data) return null;

  return {
    question_id: data.question_id,
    status: data.status,
    consecutive_success: data.consecutive_success ?? 0,
    consecutive_fails: data.consecutive_fails ?? 0,
    next_review_session: data.next_review_session,
  };
}

export async function recordQuizProgress(
  payload: Database["public"]["Tables"]["user_quiz_progress"]["Insert"],
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await safeQuery(
    supabase.from("user_quiz_progress").insert(payload),
    "recordQuizProgress error",
    { questionId: payload.question_id },
    payload as Record<string, unknown>,
  );

  if (error) return { success: false, error };
  return { success: true };
}

export async function upsertUserQuestionStatus(
  payload: Database["public"]["Tables"]["user_question_status"]["Insert"],
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await safeQuery(
    supabase
      .from("user_question_status")
      .upsert(payload, { onConflict: "user_id,question_id" }),
    "upsertUserQuestionStatus error",
    { questionId: payload.question_id },
    { ...payload, _type: "upsert_status" },
  );

  if (error) return { success: false, error };
  return { success: true };
}

export async function getChunkMastery(
  userId: string,
  chunkId: string,
): Promise<ChunkMasteryRow | null> {
  const { data } = await safeQuery<{
    chunk_id: string;
    mastery_score: number;
    last_full_review_at: string | null;
    total_questions_seen: number | null;
  }>(
    supabase
      .from("chunk_mastery")
      .select(
        "chunk_id, mastery_score, last_full_review_at, total_questions_seen",
      )
      .eq("user_id", userId)
      .eq("chunk_id", chunkId)
      .maybeSingle(),
    "getChunkMastery error",
    { userId, chunkId },
  );

  if (!data) return null;

  return {
    chunk_id: data.chunk_id,
    mastery_score: data.mastery_score,
    last_full_review_at: data.last_full_review_at,
    total_questions_seen: data.total_questions_seen ?? 0,
  };
}

export async function upsertChunkMastery(
  payload: Database["public"]["Tables"]["chunk_mastery"]["Insert"],
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await safeQuery(
    supabase
      .from("chunk_mastery")
      .upsert(payload, { onConflict: "user_id,chunk_id" }),
    "upsertChunkMastery error",
    { chunkId: payload.chunk_id },
    { ...payload, _type: "upsert_mastery" },
  );

  if (error) return { success: false, error };
  return { success: true };
}
