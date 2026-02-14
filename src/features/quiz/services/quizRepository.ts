/**
 * Quiz Repository (Data Access Layer)
 *
 * Centralizes all Supabase interactions for the Quiz feature.
 * Strictly typed and separated from business logic.
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { type Database, type Json } from '@/types/database.types';
import { type ChunkMasteryRow } from '@/features/quiz/types';
import { parseArray, parseRow } from '@/utils/helpers';
import { z } from 'zod';
import {
  ChunkWithContentSchema,
  FollowUpQuestionRowSchema,
  QuestionWithStatusRowSchema,
} from '@/features/quiz/types';
import { DAILY_QUOTA, MASTERY_THRESHOLD } from '@/utils/constants';
import { addToOfflineQueue } from '@/lib/offlineQueueService';

const quizLogger = logger.withPrefix('[QuizRepository]');

// --- Types ---

export interface SessionCounter {
  current_session: number;
  is_new_session: boolean;
}

export interface UserQuestionStatusRow {
  question_id: string;
  status: Database['public']['Enums']['question_status'];
  consecutive_success: number;
  consecutive_fails: number;
  next_review_session: number | null;
}

export interface SessionResultStats {
  correctCount: number;
  incorrectCount: number;
  blankCount: number;
  timeSpentMs: number;
  courseId: string;
  userId: string;
}

type QuestionRow = Database['public']['Tables']['questions']['Row'];
type NoteChunkRow = Database['public']['Tables']['note_chunks']['Row'];

// --- Session Management ---

export async function incrementCourseSession(
  userId: string,
  courseId: string
): Promise<{ data: SessionCounter | null; error: Error | null }> {
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'increment_course_session',
    {
      p_user_id: userId,
      p_course_id: courseId,
    }
  );

  if (rpcError) {
    logger.error('RPC Error:', rpcError);
    return { data: null, error: new Error(rpcError.message) };
  }

  // RPC returns a single object or array depending on definition, but typings should handle it.
  // If it returns array:
  if (Array.isArray(rpcResult) && rpcResult.length > 0) {
    return { data: rpcResult[0], error: null };
  }
  // If it returns object:
  if (rpcResult && !Array.isArray(rpcResult)) {
    return { data: rpcResult, error: null };
  }

  return { data: null, error: new Error('Unknown RPC error') };
}

export async function getSessionInfo(userId: string, courseId: string) {
  const { data } = await supabase
    .from('course_session_counters')
    .select('current_session')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (!data) return { currentSession: 1, totalSessions: 0, courseId };
  return {
    currentSession: data.current_session || 1,
    totalSessions: data.current_session || 1,
    courseId,
  };
}

export async function getContentVersion(
  courseId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('courses')
    .select('created_at')
    .eq('id', courseId)
    .single();
  return data?.created_at || null;
}

export async function getQuotaInfo(
  _userId: string,
  _courseId: string,
  _sessionNumber: number
) {
  // Placeholder logic for quota info, presumably handled by backend or simpler check
  return {
    dailyQuota: DAILY_QUOTA,
    used: 0,
    pendingReviewCount: 0,
    isMaintenanceMode: false,
    reviewQuota: 10,
  };
}

export async function getCourseStats(userId: string, courseId: string) {
  const { data: masteryData } = await supabase
    .from('chunk_mastery')
    .select('total_questions_seen, mastery_score')
    .eq('user_id', userId)
    .eq('course_id', courseId);

  if (!masteryData || masteryData.length === 0) return null;

  const totalQuestionsSolved = masteryData.reduce(
    (sum, row) => sum + (row.total_questions_seen || 0),
    0
  );
  const avgMastery = Math.round(
    masteryData.reduce((sum, row) => sum + row.mastery_score, 0) /
      masteryData.length
  );

  return {
    totalQuestionsSolved,
    averageMastery: avgMastery,
  };
}

export async function getCourseName(courseId: string): Promise<string | null> {
  const { data } = await supabase
    .from('courses')
    .select('name')
    .eq('id', courseId)
    .single();
  return data?.name || null;
}

// --- Auth Support ---

export async function getCurrentSessionToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// --- Question Fetching ---

export async function getTotalQuestionsInCourse(
  courseId: string
): Promise<number> {
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);
  return count || 0;
}

export async function getArchivedQuestionsCount(
  userId: string,
  courseId: string
): Promise<number> {
  const { count } = await supabase
    .from('user_question_status')
    .select('id, questions!inner(course_id)', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', userId)
    .eq('status', 'archived')
    .eq('questions.course_id', courseId);
  return count || 0;
}

export async function getChunkQuestionCount(chunkId: string): Promise<number> {
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('chunk_id', chunkId);
  return count || 10;
}

export async function getSolvedQuestionIds(
  userId: string,
  chunkId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_quiz_progress')
    .select('question_id')
    .eq('user_id', userId)
    .eq('chunk_id', chunkId);

  return new Set(data?.map((s) => s.question_id) || []);
}

const PartialQuestionRowSchema = z.object({
  id: z.string(),
  chunk_id: z.string(),
  question_data: z.unknown(), // Could use QuizQuestionSchema if strictly typed in DB
  bloom_level: z.string().nullable(),
  concept_title: z.string().nullable(),
});

export async function fetchQuestionsByChunk(
  chunkId: string,
  limit: number,
  excludeIds: Set<string>
): Promise<z.infer<typeof PartialQuestionRowSchema>[]> {
  const query = supabase
    .from('questions')
    .select('id, chunk_id, question_data, bloom_level, concept_title')
    .eq('chunk_id', chunkId)
    .limit(limit + excludeIds.size);

  const { data, error } = await query;

  if (error) {
    quizLogger.error('fetchQuestionsByChunk error', { chunkId, error });
    return [];
  }
  if (!data) return [];

  // Safe parse using helper
  const parsed = parseArray(PartialQuestionRowSchema, data, {
    onError: (err, idx) =>
      quizLogger.warn(`Invalid question row at index ${idx}`, { error: err }),
  });

  return parsed.filter((q) => !excludeIds.has(q.id)).slice(0, limit);
}

// Interface for joined query result
export interface QuestionWithStatus {
  question_id: string;
  status: Database['public']['Enums']['question_status'];
  next_review_session: number | null;
  questions: Pick<
    QuestionRow,
    'id' | 'chunk_id' | 'course_id' | 'parent_question_id' | 'question_data'
  >;
}

export async function fetchQuestionsByStatus(
  userId: string,
  courseId: string,
  status: 'pending_followup' | 'active' | 'archived',
  maxSession: number | null,
  limit: number
): Promise<QuestionWithStatus[]> {
  let query = supabase
    .from('user_question_status')
    .select(
      `
            question_id, status, next_review_session,
            questions!inner (id, chunk_id, course_id, parent_question_id, question_data)
        `
    )
    .eq('user_id', userId)
    .eq('questions.course_id', courseId)
    .eq('status', status);

  if (maxSession !== null) {
    query = query.lte('next_review_session', maxSession);
  }

  query = query.order('updated_at', { ascending: true }).limit(limit);

  const { data } = await query;
  return parseArray(QuestionWithStatusRowSchema, data || [], {
    onError: (err, idx) =>
      quizLogger.warn(`Invalid question status row at index ${idx}`, {
        error: err,
      }),
  }) as QuestionWithStatus[];
}

interface FollowUpQuestionRow {
  id: string;
  chunk_id: string | null;
  course_id: string;
  parent_question_id: string | null;
  question_data: Json;
  user_question_status: { status: string }[];
}

export async function fetchNewFollowups(
  courseId: string,
  limit: number
): Promise<FollowUpQuestionRow[]> {
  const { data } = await supabase
    .from('questions')
    .select(
      `
            id, chunk_id, course_id, parent_question_id, question_data,
            user_question_status!left (status)
        `
    )
    .eq('course_id', courseId)
    .not('parent_question_id', 'is', null)
    .or(`status.is.null`, { foreignTable: 'user_question_status' })
    .limit(limit);

  return parseArray(
    FollowUpQuestionRowSchema,
    data || []
  ) as FollowUpQuestionRow[];
}

/**
 * Waterfall Question Fetching
 * Fetches questions from a specific chunk first (active/null status),
 * then falls back to other weak chunks in the course.
 */
export async function fetchWaterfallTrainingQuestions(
  userId: string,
  courseId: string,
  targetChunkId: string,
  limit: number
): Promise<QuestionWithStatus[]> {
  const results: QuestionWithStatus[] = [];

  const getFromChunk = async (
    chunkId: string,
    currentLimit: number
  ): Promise<QuestionWithStatus[]> => {
    // 1. Get questions in user_question_status with status 'active'
    const { data: activeData, error: activeError } = await supabase
      .from('user_question_status')
      .select(
        `
                question_id, status, next_review_session,
                questions!inner (id, chunk_id, course_id, parent_question_id, question_data)
            `
      )
      .eq('user_id', userId)
      .eq('questions.chunk_id', chunkId)
      .eq('status', 'active')
      .limit(currentLimit);

    if (activeError) {
      quizLogger.error('Failed to fetch active questions from chunk', {
        chunkId,
        error: activeError.message,
      });
      // Distinguish between error and empty: if error, return empty to continue waterfall
    }

    const formattedActive = parseArray(
      QuestionWithStatusRowSchema,
      activeData || []
    ) as QuestionWithStatus[];

    // 2. Get questions NOT in user_question_status
    const remainingLimit = currentLimit - formattedActive.length;
    let formattedNulls: QuestionWithStatus[] = [];
    if (remainingLimit > 0) {
      const { data: nullData, error: nullError } = await supabase
        .from('questions')
        .select(
          `
                    id, chunk_id, course_id, parent_question_id, question_data,
                    user_question_status!left (id)
                `
        )
        .eq('chunk_id', chunkId)
        .is('user_question_status.id', null)
        .limit(remainingLimit);

      if (nullError) {
        quizLogger.error('Failed to fetch null-status questions from chunk', {
          chunkId,
          error: nullError.message,
        });
        // Distinguish between error and empty: if error, continue with active data only
      }

      if (nullData) {
        formattedNulls = nullData.map((q) => ({
          question_id: q.id,
          status: 'active' as Database['public']['Enums']['question_status'],

          next_review_session: null,
          questions: {
            id: q.id,
            chunk_id: q.chunk_id,
            course_id: q.course_id,
            parent_question_id: q.parent_question_id,
            question_data: q.question_data,
          },
        }));
      }
    }

    return [...formattedActive, ...formattedNulls];
  };

  // Phase 1: User's Intended (Target) Chunk
  const targetResults = await getFromChunk(targetChunkId, limit);
  results.push(...targetResults);

  if (results.length >= limit) return results.slice(0, limit);

  // Phase 2: Waterfall from other weak chunks (< MASTERY_THRESHOLD% mastery, ordered by updated_at)
  const { data: weakChunks } = await supabase
    .from('chunk_mastery')
    .select('chunk_id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('chunk_id', targetChunkId)
    .lt('mastery_score', MASTERY_THRESHOLD)
    .order('updated_at', { ascending: false });

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

export async function fetchQuestionsByIds(
  ids: string[]
): Promise<
  Pick<
    QuestionRow,
    'id' | 'chunk_id' | 'question_data' | 'bloom_level' | 'concept_title'
  >[]
> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('questions')
    .select('id, chunk_id, question_data, bloom_level, concept_title')
    .in('id', ids);
  return (
    (data as Pick<
      QuestionRow,
      'id' | 'chunk_id' | 'question_data' | 'bloom_level' | 'concept_title'
    >[]) || []
  );
}

// --- Progress & State ---

export async function getUserQuestionStatus(
  userId: string,
  questionId: string
): Promise<UserQuestionStatusRow | null> {
  const { data } = await supabase
    .from('user_question_status')
    .select(
      'question_id, status, consecutive_success, consecutive_fails, next_review_session'
    )
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle();

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
  payload: Database['public']['Tables']['user_quiz_progress']['Insert']
): Promise<{ success: boolean; error?: Error }> {
  try {
    const { error } = await supabase.from('user_quiz_progress').insert(payload);

    if (error) {
      quizLogger.error('Failed to record quiz progress', {
        questionId: payload.question_id,
        error: error.message,
      });
      // Add to offline queue for later sync
      addToOfflineQueue(payload as Record<string, unknown>);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true };
  } catch (err) {
    quizLogger.error('Unexpected error in recordQuizProgress', err as Error);
    // Add to offline queue for later sync
    addToOfflineQueue(payload as Record<string, unknown>);
    return {
      success: false,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

export async function upsertUserQuestionStatus(
  payload: Database['public']['Tables']['user_question_status']['Insert']
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await supabase
    .from('user_question_status')
    .upsert(payload, { onConflict: 'user_id,question_id' });

  if (error) {
    quizLogger.error('Failed to upsert user question status', {
      questionId: payload.question_id,
      error: error.message,
    });
    // Add to offline queue
    addToOfflineQueue({ ...payload, _type: 'upsert_status' });
    return { success: false, error: new Error(error.message) };
  }

  return { success: true };
}

export async function getUniqueSolvedCountInChunk(
  userId: string,
  chunkId: string
): Promise<number> {
  const { count } = await supabase
    .from('user_question_status')
    .select('question_id, questions!inner(chunk_id)', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', userId)
    .eq('questions.chunk_id', chunkId)
    .in('status', ['archived', 'pending_followup']);
  return count || 0;
}

export async function getChunkMastery(
  userId: string,
  chunkId: string
): Promise<ChunkMasteryRow | null> {
  const { data } = await supabase
    .from('chunk_mastery')
    .select(
      'chunk_id, mastery_score, last_full_review_at, total_questions_seen'
    )
    .eq('user_id', userId)
    .eq('chunk_id', chunkId)
    .maybeSingle();

  if (!data) return null;

  return {
    chunk_id: data.chunk_id,
    mastery_score: data.mastery_score,
    last_full_review_at: data.last_full_review_at,
    total_questions_seen: data.total_questions_seen ?? 0,
  };
}

export async function upsertChunkMastery(
  payload: Database['public']['Tables']['chunk_mastery']['Insert']
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await supabase
    .from('chunk_mastery')
    .upsert(payload, { onConflict: 'user_id,chunk_id' });

  if (error) {
    quizLogger.error('Failed to upsert chunk mastery', {
      chunkId: payload.chunk_id,
      error: error.message,
    });
    // Add to offline queue
    addToOfflineQueue({ ...payload, _type: 'upsert_mastery' });
    return { success: false, error: new Error(error.message) };
  }

  return { success: true };
}

export async function getFrontierChunkId(
  userId: string,
  courseId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('chunk_mastery')
    .select('chunk_id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.chunk_id || null;
}

export async function getRecentDiagnoses(
  userId: string,
  chunkId: string,
  limit: number
): Promise<string[]> {
  const { data } = await supabase
    .from('user_quiz_progress')
    .select('ai_diagnosis')
    .eq('user_id', userId)
    .eq('chunk_id', chunkId)
    .not('ai_diagnosis', 'is', null)
    .order('answered_at', { ascending: false })
    .limit(limit);

  return (data || [])
    .map((p) => p.ai_diagnosis)
    .filter((d): d is string => Boolean(d));
}

// --- Metadata & Utils ---

export async function getChunkMetadata(
  chunkId: string
): Promise<Pick<
  NoteChunkRow,
  'course_id' | 'metadata' | 'status' | 'content'
> | null> {
  const { data } = await supabase
    .from('note_chunks')
    .select('course_id, metadata, status, content')
    .eq('id', chunkId)
    .single();
  return data;
}

export async function getQuestionData(
  questionId: string
): Promise<Pick<
  QuestionRow,
  'id' | 'chunk_id' | 'question_data' | 'bloom_level' | 'concept_title'
> | null> {
  const { data } = await supabase
    .from('questions')
    .select('id, chunk_id, question_data, bloom_level, concept_title')
    .eq('id', questionId)
    .single();
  return data as Pick<
    QuestionRow,
    'id' | 'chunk_id' | 'question_data' | 'bloom_level' | 'concept_title'
  > | null;
}

export async function getCourseStatsAggregate(
  userId: string,
  courseId: string
) {
  const { data: masteryData } = await supabase
    .from('chunk_mastery')
    .select('total_questions_seen, mastery_score')
    .eq('user_id', userId)
    .eq('course_id', courseId);
  return masteryData;
}

export async function fetchCourseChunks(courseId: string) {
  const { data } = await supabase
    .from('note_chunks')
    .select('id, metadata, content')
    .eq('course_id', courseId)
    .eq('status', 'COMPLETED');
  return data || [];
}

export async function fetchCourseMastery(courseId: string, userId: string) {
  const { data } = await supabase
    .from('chunk_mastery')
    .select('chunk_id, mastery_score')
    .eq('course_id', courseId)
    .eq('user_id', userId);
  return data || [];
}

export async function fetchPrerequisiteQuestions(
  courseId: string,
  concepts: string[],
  limit: number
) {
  const { data } = await supabase
    .from('questions')
    .select('id, chunk_id, concept_title, bloom_level')
    .eq('course_id', courseId)
    .in('concept_title', concepts)
    .limit(limit);
  return data || [];
}

export async function fetchGeneratedQuestions(
  chunkId: string,
  usageType: Database['public']['Enums']['question_usage_type'],
  limit: number
) {
  const { data } = await supabase
    .from('questions')
    .select('id')
    .eq('chunk_id', chunkId)
    .eq('usage_type', usageType)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getAntrenmanQuestionCount(
  chunkId: string
): Promise<number> {
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('chunk_id', chunkId)
    .eq('usage_type', 'antrenman');
  return count || 0;
}

export async function getChunkWithContent(chunkId: string): Promise<
  | (Pick<
      NoteChunkRow,
      | 'id'
      | 'course_id'
      | 'metadata'
      | 'status'
      | 'content'
      | 'display_content'
      | 'course_name'
      | 'section_title'
    > & {
      ai_logic?: Record<string, unknown>;
    })
  | null
> {
  const { data } = await supabase
    .from('note_chunks')
    .select(
      'id, course_id, metadata, status, content, display_content, course_name, section_title, ai_logic'
    )
    .eq('id', chunkId)
    .single();

  if (!data) return null;

  return parseRow(ChunkWithContentSchema, data) as
    | (Pick<
        NoteChunkRow,
        | 'id'
        | 'course_id'
        | 'metadata'
        | 'status'
        | 'content'
        | 'display_content'
        | 'course_name'
        | 'section_title'
      > & {
        ai_logic?: Record<string, unknown>;
      })
    | null;
}
export async function updateChunkStatus(
  chunkId: string,
  status: Database['public']['Enums']['chunk_generation_status']
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await supabase
    .from('note_chunks')
    .update({ status })
    .eq('id', chunkId);

  if (error) {
    quizLogger.error('Failed to update chunk status', {
      chunkId,
      status,
      error: error.message,
    });
    return { success: false, error: new Error(error.message) };
  }

  return { success: true };
}

export async function updateChunkMetadata(
  chunkId: string,
  metadata: Json
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await supabase
    .from('note_chunks')
    .update({ metadata })
    .eq('id', chunkId);

  if (error) {
    quizLogger.error('Failed to update chunk metadata', {
      chunkId,
      error: error.message,
    });
    return { success: false, error: new Error(error.message) };
  }

  return { success: true };
}

export async function updateChunkAILogic(
  chunkId: string,
  aiLogic: {
    suggested_quotas: { antrenman: number; arsiv: number; deneme: number };
  }
): Promise<{ success: boolean; error?: Error }> {
  const updateData: Record<string, unknown> = {
    ai_logic: aiLogic,
  };

  const { error } = await supabase
    .from('note_chunks')
    .update(updateData)
    .eq('id', chunkId);

  if (error) {
    quizLogger.error('Failed to update chunk AI logic', {
      chunkId,
      error: error.message,
    });
    return { success: false, error: new Error(error.message) };
  }

  return { success: true };
}

export async function fetchCachedQuestion(
  chunkId: string,
  usageType: Database['public']['Enums']['question_usage_type'],
  conceptTitle: string
): Promise<Pick<
  QuestionRow,
  'id' | 'chunk_id' | 'question_data' | 'bloom_level' | 'concept_title'
> | null> {
  const { data } = await supabase
    .from('questions')
    .select('id, chunk_id, question_data, bloom_level, concept_title')
    .eq('chunk_id', chunkId)
    .ilike('concept_title', conceptTitle.trim())
    .eq('usage_type', usageType)
    .maybeSingle();
  return data as Pick<
    QuestionRow,
    'id' | 'chunk_id' | 'question_data' | 'bloom_level' | 'concept_title'
  > | null;
}

export async function createQuestion(
  payload: Database['public']['Tables']['questions']['Insert']
): Promise<{ success: boolean; id?: string; error?: Error }> {
  const { data, error } = await supabase
    .from('questions')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    quizLogger.error('Failed to create question', {
      chunkId: payload.chunk_id,
      error: error.message,
    });
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, id: data?.id };
}

export async function createQuestions(
  payloads: Database['public']['Tables']['questions']['Insert'][]
): Promise<{ success: boolean; ids?: string[]; error?: Error }> {
  const { data, error } = await supabase
    .from('questions')
    .insert(payloads)
    .select('id');

  if (error) {
    quizLogger.error('Failed to create questions batch', {
      count: payloads.length,
      error: error.message,
    });
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, ids: data?.map((d) => d.id) || [] };
}

// --- Quota & Status ---

export async function getChunkQuotaStatus(chunkId: string) {
  const { data } = await supabase
    .from('note_chunks')
    .select('id, course_id, status, metadata, ai_logic')
    .eq('id', chunkId)
    .single();

  if (!data) return null;

  const metadata = (data.metadata as Record<string, Json>) || {};
  const aiLogic = (data.ai_logic as Record<string, Json>) || {};

  // 1. Live Count (Database Source of Truth)
  const used = await getAntrenmanQuestionCount(chunkId);

  // 2. Get AI quotas from ai_logic column (primary source)
  const aiQuotas =
    (aiLogic.suggested_quotas as {
      antrenman?: number;
      arsiv?: number;
      deneme?: number;
    }) || {};

  // 3. Fallback to default
  const totalQuota = aiQuotas.antrenman ?? 5;

  const concepts = (metadata.concept_map as { isException?: boolean }[]) || [];

  return {
    used,
    quota: { total: totalQuota },
    conceptCount: concepts.length,
    isFull: used >= totalQuota,
    status: data.status || 'PENDING',
    difficultyIndex: (metadata.difficulty_index || 3) as number,
  };
}

// --- Session Finalization ---

export async function finishQuizSession(
  stats: SessionResultStats
): Promise<{ success: boolean; sessionComplete?: boolean; error?: Error }> {
  try {
    // Optimized upsert using onConflict for atomic increment
    const { error: upsertError } = await supabase
      .from('course_session_counters')
      .upsert(
        {
          course_id: stats.courseId,
          user_id: stats.userId,
          current_session: 1, // Initial value, will be incremented by trigger or handled via RPC
          last_session_date: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,course_id',
        }
      );

    if (upsertError) {
      quizLogger.error('Failed to finish quiz session', {
        courseId: stats.courseId,
        userId: stats.userId,
        error: upsertError.message,
      });
      return { success: false, error: new Error(upsertError.message) };
    }

    return {
      success: true,
      sessionComplete: true,
    };
  } catch (err) {
    quizLogger.error('Unexpected error in finishQuizSession', err as Error);
    return {
      success: false,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
