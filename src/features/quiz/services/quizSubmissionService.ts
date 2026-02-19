import { supabase } from '@/lib/supabase';
import { type Database, type Json } from '@/types/database.types';
import { safeQuery } from '@/lib/supabaseHelpers';
import { parseOrThrow } from '@/utils/validation';
import {
  ChunkMetadataSchema,
  type QuizResponseType,
  type SubmissionResult,
} from '@/features/quiz/types';
import { calculateQuizResult } from '@/features/quiz/logic/quizLogic';
import {
  getChunkMastery,
  getChunkMetadata,
  getChunkQuestionCount,
  getQuestionData,
  getUniqueSolvedCountInChunk,
  getUserQuestionStatus,
} from './quizCoreService';

export async function updateChunkMetadata(
  chunkId: string,
  metadata: Json
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await safeQuery<null>(
    supabase.from('note_chunks').update({ metadata }).eq('id', chunkId),
    'updateChunkMetadata error',
    { chunkId }
  );

  if (error) return { success: false, error };
  return { success: true };
}

export async function createQuestion(
  payload: Database['public']['Tables']['questions']['Insert']
): Promise<{ success: boolean; id?: string; error?: Error }> {
  const { data, error } = await safeQuery<{ id: string }>(
    supabase.from('questions').insert(payload).select('id').single(),
    'createQuestion error',
    { chunkId: payload.chunk_id },
    payload as Record<string, unknown>
  );

  if (error) return { success: false, error };
  return { success: true, id: data?.id };
}

export async function createQuestions(
  payloads: Database['public']['Tables']['questions']['Insert'][]
): Promise<{ success: boolean; ids?: string[]; error?: Error }> {
  const { data, error } = await safeQuery<{ id: string }[]>(
    supabase.from('questions').insert(payloads).select('id'),
    'createQuestions error',
    { count: payloads.length },
    { payloads, _type: 'bulk_create_questions' }
  );

  if (error) return { success: false, error };
  return { success: true, ids: data?.map((d) => d.id) || [] };
}

export async function incrementCourseSession(userId: string, courseId: string) {
  type SessionResult = { current_session: number; is_new_session: boolean };
  return safeQuery<SessionResult[]>(
    supabase.rpc('increment_course_session', {
      p_user_id: userId,
      p_course_id: courseId,
    }),
    'incrementCourseSession error',
    { userId, courseId }
  ).then(({ data, error }) => {
    if (error) return { data: null, error };
    if (Array.isArray(data) && data.length > 0) {
      return { data: data[0], error: null };
    }
    if (data && !Array.isArray(data)) {
      return { data: null, error: new Error('Unexpected RPC response format') };
    }
    return { data: null, error: new Error('Unknown RPC ID return') };
  });
}

export async function finishQuizSession(stats: {
  userId: string;
  courseId: string;
}): Promise<{ success: boolean; sessionComplete?: boolean; error?: Error }> {
  const { error } = await safeQuery<null>(
    supabase.from('course_session_counters').upsert(
      {
        course_id: stats.courseId,
        user_id: stats.userId,
        current_session: 1,
        last_session_date: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,course_id',
      }
    ),
    'finishQuizSession error',
    { userId: stats.userId, courseId: stats.courseId }
  );

  if (error) return { success: false, error };
  return { success: true, sessionComplete: true };
}

export async function recordQuizProgress(
  payload: Database['public']['Tables']['user_quiz_progress']['Insert']
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await safeQuery(
    supabase.from('user_quiz_progress').insert(payload),
    'recordQuizProgress error',
    { questionId: payload.question_id },
    payload as Record<string, unknown>
  );

  if (error) return { success: false, error };
  return { success: true };
}

export async function upsertUserQuestionStatus(
  payload: Database['public']['Tables']['user_question_status']['Insert']
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await safeQuery(
    supabase
      .from('user_question_status')
      .upsert(payload, { onConflict: 'user_id,question_id' }),
    'upsertUserQuestionStatus error',
    { questionId: payload.question_id },
    { ...payload, _type: 'upsert_status' }
  );

  if (error) return { success: false, error };
  return { success: true };
}

export async function upsertChunkMastery(
  payload: Database['public']['Tables']['chunk_mastery']['Insert']
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await safeQuery(
    supabase
      .from('chunk_mastery')
      .upsert(payload, { onConflict: 'user_id,chunk_id' }),
    'upsertChunkMastery error',
    { chunkId: payload.chunk_id },
    { ...payload, _type: 'upsert_mastery' }
  );

  if (error) return { success: false, error };
  return { success: true };
}

export async function updateChunkStatus(
  chunkId: string,
  status: Database['public']['Enums']['chunk_generation_status']
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await safeQuery<null>(
    supabase.from('note_chunks').update({ status }).eq('id', chunkId),
    'updateChunkStatus error',
    { chunkId, status }
  );

  if (error) return { success: false, error };
  return { success: true };
}

export async function updateChunkAILogic(
  chunkId: string,
  aiLogic: Json
): Promise<{ success: boolean; error?: Error }> {
  const { error } = await safeQuery<null>(
    supabase
      .from('note_chunks')
      .update({ ai_logic: aiLogic })
      .eq('id', chunkId),
    'updateChunkAILogic error',
    { chunkId }
  );

  if (error) return { success: false, error };
  return { success: true };
}

export async function submitQuizAnswer(
  ctx: { userId: string; courseId: string; sessionNumber: number },
  questionId: string,
  chunkId: string | null,
  responseType: QuizResponseType,
  timeSpentMs: number,
  selectedAnswer: number | null
): Promise<SubmissionResult> {
  const [currentStatus, questionData] = await Promise.all([
    getUserQuestionStatus(ctx.userId, questionId),
    getQuestionData(questionId),
  ]);

  const targetChunkId = chunkId || questionData?.chunk_id || null;
  const [chunkMetadata, masteryData, uniqueSolvedCount, totalChunkQuestions] =
    targetChunkId
      ? await Promise.all([
          getChunkMetadata(targetChunkId),
          getChunkMastery(ctx.userId, targetChunkId),
          getUniqueSolvedCountInChunk(ctx.userId, targetChunkId),
          getChunkQuestionCount(targetChunkId),
        ])
      : [null, null, 0, 0];

  const result = calculateQuizResult(
    currentStatus,
    responseType,
    timeSpentMs,
    questionData
      ? {
          bloom_level: questionData.bloom_level,
          chunk_id: questionData.chunk_id,
          usage_type: questionData.usage_type,
        }
      : null,
    chunkMetadata
      ? {
          content: chunkMetadata.content || null,
          metadata: parseOrThrow(ChunkMetadataSchema, chunkMetadata.metadata),
        }
      : null,
    masteryData,
    uniqueSolvedCount,
    totalChunkQuestions,
    ctx.sessionNumber
  );

  const updates: Promise<unknown>[] = [
    upsertUserQuestionStatus({
      user_id: ctx.userId,
      question_id: questionId,
      status: result.newStatus,
      consecutive_success: result.newSuccessCount,
      consecutive_fails: result.newFailsCount,
      next_review_session: result.nextReviewSession,
    }),
    recordQuizProgress({
      user_id: ctx.userId,
      question_id: questionId,
      chunk_id: targetChunkId,
      course_id: ctx.courseId,
      response_type: responseType,
      selected_answer: selectedAnswer,
      session_number: ctx.sessionNumber,
      is_review_question: false,
      time_spent_ms: timeSpentMs,
    }),
  ];

  if (targetChunkId) {
    updates.push(
      upsertChunkMastery({
        user_id: ctx.userId,
        chunk_id: targetChunkId,
        course_id: ctx.courseId,
        mastery_score: result.newMastery,
        last_reviewed_session: ctx.sessionNumber,
        updated_at: new Date().toISOString(),
      })
    );
  }

  await Promise.all(updates);
  return result;
}
