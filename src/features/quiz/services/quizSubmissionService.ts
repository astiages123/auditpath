import { supabase } from '@/lib/supabase';
import { type Database, type Json } from '@/types/database.types';
import { safeQuery } from '@/lib/supabaseHelpers';
import { isValidUuid, parseOrThrow } from '@/utils/validation';
import {
  type QuizResponseType,
  type SubmissionResult,
  SubmitQuizAnswerSchema,
} from '@/features/quiz/types';
import { calculateQuizResult } from '../logic/srsLogic';
import { getChunkMastery, getUserQuestionStatus } from './quizCoreService';
import { getQuestionData } from './quizQuestionService';

export async function updateChunkMetadata(
  chunkId: string,
  metadata: Json
): Promise<{ success: boolean; error?: Error }> {
  const { success, error } = await safeQuery<null>(
    supabase.from('note_chunks').update({ metadata }).eq('id', chunkId),
    'updateChunkMetadata error',
    { chunkId }
  );

  if (!success) return { success: false, error: new Error(error) };
  return { success: true };
}

export async function createQuestion(
  payload: Database['public']['Tables']['questions']['Insert']
): Promise<{ success: boolean; id?: string; error?: Error }> {
  const { success, data, error } = await safeQuery<{ id: string }>(
    supabase.from('questions').insert(payload).select('id').single(),
    'createQuestion error',
    { chunkId: payload.chunk_id, ...payload }
  );

  if (!success) return { success: false, error: new Error(error) };
  return { success: true, id: data?.id };
}

export async function createQuestions(
  payloads: Database['public']['Tables']['questions']['Insert'][]
): Promise<{ success: boolean; ids?: string[]; error?: Error }> {
  const { success, data, error } = await safeQuery<{ id: string }[]>(
    supabase.from('questions').insert(payloads).select('id'),
    'createQuestions error',
    { count: payloads.length, payloads, _type: 'bulk_create_questions' }
  );

  if (!success) return { success: false, error: new Error(error) };
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
  ).then(({ success, data, error }) => {
    if (!success) return { data: null, error: new Error(error) };
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
  const { success, error } = await safeQuery<null>(
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

  if (!success) return { success: false, error: new Error(error) };
  return { success: true, sessionComplete: true };
}

export async function recordQuizProgress(
  payload: Database['public']['Tables']['user_quiz_progress']['Insert']
): Promise<{ success: boolean; error?: Error }> {
  if (!isValidUuid(payload.question_id)) return { success: true };

  const { success, error } = await safeQuery(
    supabase.from('user_quiz_progress').insert(payload),
    'recordQuizProgress error',
    { questionId: payload.question_id, ...payload }
  );

  if (!success) return { success: false, error: new Error(error) };
  return { success: true };
}

export async function upsertUserQuestionStatus(
  payload: Database['public']['Tables']['user_question_status']['Insert']
): Promise<{ success: boolean; error?: Error }> {
  if (!isValidUuid(payload.question_id)) return { success: true };

  const { success, error } = await safeQuery(
    supabase
      .from('user_question_status')
      .upsert(payload, { onConflict: 'user_id,question_id' }),
    'upsertUserQuestionStatus error',
    { questionId: payload.question_id, ...payload, _type: 'upsert_status' }
  );

  if (!success) return { success: false, error: new Error(error) };
  return { success: true };
}

export async function upsertChunkMastery(
  payload: Database['public']['Tables']['chunk_mastery']['Insert']
): Promise<{ success: boolean; error?: Error }> {
  const { success, error } = await safeQuery(
    supabase
      .from('chunk_mastery')
      .upsert(payload, { onConflict: 'user_id,chunk_id' }),
    'upsertChunkMastery error',
    { chunkId: payload.chunk_id, ...payload, _type: 'upsert_mastery' }
  );

  if (!success) return { success: false, error: new Error(error) };
  return { success: true };
}

export async function updateChunkStatus(
  chunkId: string,
  status: Database['public']['Enums']['chunk_generation_status']
): Promise<{ success: boolean; error?: Error }> {
  const { success, error } = await safeQuery<null>(
    supabase.from('note_chunks').update({ status }).eq('id', chunkId),
    'updateChunkStatus error',
    { chunkId, status }
  );

  if (!success) return { success: false, error: new Error(error) };
  return { success: true };
}

export async function updateChunkAILogic(
  chunkId: string,
  aiLogic: Json
): Promise<{ success: boolean; error?: Error }> {
  const { success, error } = await safeQuery<null>(
    supabase
      .from('note_chunks')
      .update({ ai_logic: aiLogic })
      .eq('id', chunkId),
    'updateChunkAILogic error',
    { chunkId }
  );

  if (!success) return { success: false, error: new Error(error) };
  return { success: true };
}

// === SECTION === Mastery Helpers

// === SECTION === Quiz Submission

export async function submitQuizAnswer(
  ctx: { userId: string; courseId: string; sessionNumber: number },
  questionId: string,
  chunkId: string | null,
  responseType: QuizResponseType,
  timeSpentMs: number,
  selectedAnswer: number | null
): Promise<SubmissionResult> {
  const validated = parseOrThrow(SubmitQuizAnswerSchema, {
    questionId,
    chunkId,
    responseType,
    timeSpentMs,
    selectedAnswer,
  });

  const [currentStatus, questionData] = await Promise.all([
    getUserQuestionStatus(ctx.userId, validated.questionId),
    getQuestionData(validated.questionId),
  ]);

  const targetChunkId = validated.chunkId || questionData?.chunk_id || null;
  const masteryData = targetChunkId
    ? await getChunkMastery(ctx.userId, targetChunkId)
    : null;

  const result = calculateQuizResult(
    currentStatus,
    validated.responseType,
    masteryData?.mastery_score ?? 0,
    ctx.sessionNumber
  );

  const updates: Promise<unknown>[] = [
    upsertUserQuestionStatus({
      user_id: ctx.userId,
      question_id: validated.questionId,
      status: result.newStatus,
      rep_count: result.newRepCount,
      next_review_session: result.nextReviewSession,
    }),
    recordQuizProgress({
      user_id: ctx.userId,
      question_id: validated.questionId,
      chunk_id: targetChunkId,
      course_id: ctx.courseId,
      response_type: validated.responseType,
      selected_answer: validated.selectedAnswer,
      session_number: ctx.sessionNumber,
      is_review_question: false,
      time_spent_ms: validated.timeSpentMs,
    }),
  ];

  if (targetChunkId) {
    const REP_TO_SCORE: Record<number, number> = { 0: 0, 1: 33, 2: 66, 3: 100 };
    const oldRepCount = currentStatus ? currentStatus.rep_count : -1;
    const oldScore =
      oldRepCount >= 0 ? (REP_TO_SCORE[Math.min(oldRepCount, 3)] ?? 100) : 0;
    const newScore = REP_TO_SCORE[Math.min(result.newRepCount, 3)] ?? 100;

    let totalQuestions = masteryData?.total_questions_seen ?? 0;
    const oldMastery = masteryData?.mastery_score ?? 0;
    const isNewQuestion = oldRepCount === -1;

    // Calculate implied total score and apply increment
    const currentTotalScore = oldMastery * totalQuestions;
    if (isNewQuestion) {
      totalQuestions += 1;
    }

    const newTotalScore = currentTotalScore - oldScore + newScore;
    const newMastery =
      totalQuestions > 0 ? Math.round(newTotalScore / totalQuestions) : 0;
    const cappedMastery = Math.min(100, Math.max(0, newMastery));

    updates.push(
      upsertChunkMastery({
        user_id: ctx.userId,
        chunk_id: targetChunkId,
        course_id: ctx.courseId,
        mastery_score: cappedMastery,
        total_questions_seen: totalQuestions,
        last_reviewed_session: ctx.sessionNumber,
        updated_at: new Date().toISOString(),
      })
    );
  }

  const updateResults = await Promise.all(
    updates as Promise<{ success: boolean; error?: Error }>[]
  );

  const failed = updateResults.find(
    (r) => typeof r === 'object' && r !== null && 'success' in r && !r.success
  );

  if (failed) {
    throw (
      failed.error ||
      new Error('Yanıt veritabanına kaydedilirken bir hata oluştu')
    );
  }

  return result;
}
