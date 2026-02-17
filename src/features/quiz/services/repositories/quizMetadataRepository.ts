/**
 * Quiz Metadata Repository (Data Access Layer)
 *
 * Handles chunk metadata, status updates, and AI logic configuration.
 */

import { supabase } from "@/lib/supabase";
import { type Database, type Json } from "@/types/database.types";
import { ChunkWithContentSchema } from "@/features/quiz/types/quizSchemas";
import { parseRow } from "@/utils/helpers";
import { getAntrenmanQuestionCount } from "./quizQuestionRepository";
import { safeQuery } from "@/lib/supabaseHelpers";

// --- Types ---

type NoteChunkRow = Database["public"]["Tables"]["note_chunks"]["Row"];

// --- Metadata & Utils ---

export async function getChunkMetadata(
  chunkId: string,
): Promise<
  Pick<
    NoteChunkRow,
    "course_id" | "metadata" | "status" | "content"
  > | null
> {
  const { data } = await safeQuery<
    Pick<NoteChunkRow, "course_id" | "metadata" | "status" | "content">
  >(
    supabase
      .from("note_chunks")
      .select("course_id, metadata, status, content")
      .eq("id", chunkId)
      .single(),
    "getChunkMetadata error",
    { chunkId },
  );
  return data;
}

export async function updateChunkStatus(
  chunkId: string,
  status: Database["public"]["Enums"]["chunk_generation_status"],
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await safeQuery<null>(
    supabase.from("note_chunks").update({ status }).eq("id", chunkId),
    "updateChunkStatus error",
    { chunkId, status },
  );

  if (error) return { success: false, error };
  return { success: true };
}

export async function getChunkQuotaStatus(chunkId: string) {
  const { data } = await safeQuery<{
    id: string;
    course_id: string;
    status: string | null;
    metadata: Json;
    ai_logic: Json;
  }>(
    supabase
      .from("note_chunks")
      .select("id, course_id, status, metadata, ai_logic")
      .eq("id", chunkId)
      .single(),
    "getChunkQuotaStatus error",
    { chunkId },
  );

  if (!data) return null;

  const metadata = (data.metadata as Record<string, Json>) || {};
  const aiLogic = (data.ai_logic as Record<string, Json>) || {};

  const used = await getAntrenmanQuestionCount(chunkId);

  const aiQuotas = (aiLogic.suggested_quotas as {
    antrenman?: number;
    arsiv?: number;
    deneme?: number;
  }) || {};

  const totalQuota = aiQuotas.antrenman ?? 5;

  const concepts = (metadata.concept_map as { isException?: boolean }[]) || [];

  return {
    used,
    quota: { total: totalQuota },
    conceptCount: concepts.length,
    isFull: used >= totalQuota,
    status: data.status || "PENDING",
    difficultyIndex: (metadata.difficulty_index || 3) as number,
  };
}

export async function updateChunkAILogic(
  chunkId: string,
  aiLogic: {
    suggested_quotas: { antrenman: number; arsiv: number; deneme: number };
    reasoning?: string;
  },
): Promise<{ success: boolean; error?: Error }> {
  const updateData: Record<string, unknown> = {
    ai_logic: aiLogic,
  };

  const { error } = await safeQuery<null>(
    supabase.from("note_chunks").update(updateData).eq("id", chunkId),
    "updateChunkAILogic error",
    { chunkId },
  );

  if (error) return { success: false, error };
  return { success: true };
}

export async function getChunkWithContent(chunkId: string): Promise<
  | (
    & Pick<
      NoteChunkRow,
      | "id"
      | "course_id"
      | "metadata"
      | "status"
      | "content"
      | "display_content"
      | "course_name"
      | "section_title"
    >
    & {
      ai_logic?: Record<string, unknown>;
    }
  )
  | null
> {
  const { data } = await safeQuery<Record<string, unknown>>(
    supabase
      .from("note_chunks")
      .select(
        "id, course_id, metadata, status, content, display_content, course_name, section_title, ai_logic",
      )
      .eq("id", chunkId)
      .single(),
    "getChunkWithContent error",
    { chunkId },
  );

  if (!data) return null;

  return parseRow(ChunkWithContentSchema, data) as
    | (
      & Pick<
        NoteChunkRow,
        | "id"
        | "course_id"
        | "metadata"
        | "status"
        | "content"
        | "display_content"
        | "course_name"
        | "section_title"
      >
      & {
        ai_logic?: Record<string, unknown>;
      }
    )
    | null;
}
