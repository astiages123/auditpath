import { supabase } from "@/lib/supabase";
import { handleSupabaseError } from "@/lib/supabaseHelpers";
import { getSubjectStrategy } from "@/features/quiz/logic/algorithms/strategy";
import { type ConceptMapItem } from "@/features/quiz/types";
import { isValid, parseOrThrow } from "@/utils/helpers";
import { ChunkMetadataSchema } from "@/features/quiz/types";

interface ChunkInput {
  course_name: string | null;
  metadata: unknown;
  ai_logic: unknown;
}

interface TopicQuotaResult {
  quota: { total: number; antrenman: number; arsiv: number; deneme: number };
  importance: "high" | "medium" | "low";
  concepts: ConceptMapItem[];
  difficultyIndex: number | null;
  aiLogic: {
    suggested_quotas?: {
      antrenman: number;
      arsiv: number;
      deneme: number;
    };
  } | null;
}

export async function fetchTopicChunkInfo(courseId: string, topic: string) {
  const { data: chunk, error } = await supabase
    .from("note_chunks")
    .select("id, course_name, metadata, ai_logic")
    .eq("course_id", courseId)
    .eq("section_title", topic)
    .limit(1)
    .maybeSingle();

  if (error) {
    await handleSupabaseError(error, "fetchTopicChunkInfo");
    return null;
  }
  return chunk;
}

export function calculateTopicQuota(
  chunk: ChunkInput | null,
): TopicQuotaResult {
  let quota = { total: 0, antrenman: 0, arsiv: 0, deneme: 0 };
  let importance: "high" | "medium" | "low" = "medium";
  let concepts: ConceptMapItem[] = [];
  let difficultyIndex: number | null = null;

  if (chunk) {
    const strategy = getSubjectStrategy(chunk.course_name || "");
    if (strategy) {
      importance = strategy.importance as "high" | "medium" | "low";
    }

    const aiLogic = chunk.ai_logic as {
      suggested_quotas?: {
        antrenman: number;
        arsiv: number;
        deneme: number;
      };
    } | null;

    const aiQuotas = aiLogic?.suggested_quotas;

    const metadata = isValid(ChunkMetadataSchema, chunk.metadata)
      ? parseOrThrow(ChunkMetadataSchema, chunk.metadata)
      : null;
    concepts = metadata?.concept_map || [];
    difficultyIndex = metadata?.difficulty_index || null;

    const defaultQuotas = { antrenman: 5, arsiv: 1, deneme: 1 };
    const antrenman = aiQuotas?.antrenman ?? defaultQuotas.antrenman;
    const arsiv = aiQuotas?.arsiv ?? defaultQuotas.arsiv;
    const deneme = aiQuotas?.deneme ?? defaultQuotas.deneme;

    quota = {
      total: antrenman + arsiv + deneme,
      antrenman,
      arsiv,
      deneme,
    };
  }

  return {
    quota,
    importance,
    concepts,
    difficultyIndex,
    aiLogic: quota.antrenman !== 0 || quota.arsiv !== 0 || quota.deneme !== 0
      ? {
        suggested_quotas: {
          antrenman: quota.antrenman,
          arsiv: quota.arsiv,
          deneme: quota.deneme,
        },
      }
      : null,
  };
}

export async function fetchTopicQuestions(courseId: string, topic: string) {
  const { data: questions, error } = await supabase
    .from("questions")
    .select("id, usage_type, parent_question_id")
    .eq("course_id", courseId)
    .eq("section_title", topic);

  if (error) {
    await handleSupabaseError(error, "fetchTopicQuestions");
    return [];
  }
  return questions || [];
}

export async function calculateSrsDueCount(
  userId: string,
  questionIds: string[],
  currentSession: number,
) {
  if (questionIds.length === 0) return 0;

  const { data: dueStatus, error } = await supabase
    .from("user_question_status")
    .select("question_id")
    .eq("user_id", userId)
    .eq("status", "archived")
    .in("question_id", questionIds)
    .lte("next_review_session", currentSession);

  if (error) {
    await handleSupabaseError(error, "calculateSrsDueCount");
    return 0;
  }
  return dueStatus?.length || 0;
}
