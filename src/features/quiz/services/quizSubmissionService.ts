import { supabase } from '@/lib/supabase';
import { type Database, type Json } from '@/types/database.types';
import { safeQuery } from '@/lib/supabaseHelpers';
import { logger } from '@/utils/logger';
import { isValidUuid, parseOrThrow } from '@/utils/validation';
import {
  type QuizResponseType,
  type SubmissionResult,
  SubmitQuizAnswerSchema,
} from '@/features/quiz/types';
import {
  calculateAggregateMastery,
  calculateQuizResult,
} from '../logic/srsLogic';
import { getChunkMastery } from './quizChunkService';
import { getQuestionData, getUserQuestionStatus } from './quizReadService';

const MODULE = 'QuizSubmissionService';

export interface SessionResult {
  /** Mevcut seans numarası */
  current_session: number;
  /** Bu seans yeni mi başlatıldı? */
  is_new_session: boolean;
}

export interface GenericStatusResponse {
  /** İşlem başarılı mı? */
  success: boolean;
  /** Hata detayı */
  error?: Error;
}

interface AtomicQuizSubmissionPayload {
  userId: string;
  questionId: string;
  chunkId: string | null;
  courseId: string;
  responseType: QuizResponseType;
  selectedAnswer: number | null;
  sessionNumber: number;
  timeSpentMs: number;
  newStatus: Database['public']['Enums']['question_status'];
  newRepCount: number;
  nextReviewSession: number;
  masteryScore?: number;
  totalQuestionsSeen?: number;
}

function createError(message: string | undefined, fallback: string): Error {
  return new Error(message || fallback);
}

function throwQueryError(func: string, error: string | undefined): never {
  const errorObject = createError(error, `${func} failed`);
  logger.error(MODULE, func, 'Hata:', errorObject);
  throw errorObject;
}

/**
 * Bir chunk'ın (ünite) metadata bilgisini günceller.
 *
 * @param chunkId - Ünite ID'si
 * @param metadata - Yeni metadata (JSON)
 * @returns İşlem sonucu
 */
export async function updateChunkMetadata(
  chunkId: string,
  metadata: Json
): Promise<GenericStatusResponse> {
  const FUNC = 'updateChunkMetadata';

  const result = await safeQuery<null>(
    supabase.from('note_chunks').update({ metadata }).eq('id', chunkId),
    `${FUNC} error`,
    { chunkId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return { success: true };
}

/**
 * Kursun oturum sayacını bir artırır (RPC kullanır).
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns Yeni seans bilgileri
 */
export async function incrementCourseSession(userId: string, courseId: string) {
  const FUNC = 'incrementCourseSession';

  const result = await safeQuery<SessionResult[]>(
    supabase.rpc('increment_course_session', {
      p_user_id: userId,
      p_course_id: courseId,
    }),
    `${FUNC} error`,
    { userId, courseId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  if (Array.isArray(result.data) && result.data.length > 0) {
    return { data: result.data[0], error: null };
  }

  throw createError(undefined, 'Unexpected RPC response format');
}

/**
 * Quiz oturumunu bitirir ve sayaçları günceller/başlatır.
 *
 * @param stats - { userId, courseId }
 * @returns İşlem sonucu
 */
export async function finishQuizSession(stats: {
  userId: string;
  courseId: string;
}): Promise<{ success: boolean; sessionComplete?: boolean; error?: Error }> {
  await incrementCourseSession(stats.userId, stats.courseId);
  return { success: true, sessionComplete: true };
}

async function applyQuizSubmissionTransaction(
  payload: AtomicQuizSubmissionPayload
): Promise<{ success: boolean; progressId?: string; error?: Error }> {
  const FUNC = 'applyQuizSubmissionTransaction';

  const result = await safeQuery<{ progress_id: string }[]>(
    supabase.rpc('apply_quiz_submission', {
      p_user_id: payload.userId,
      p_question_id: payload.questionId,
      p_chunk_id: payload.chunkId,
      p_course_id: payload.courseId,
      p_response_type: payload.responseType,
      p_selected_answer: payload.selectedAnswer,
      p_session_number: payload.sessionNumber,
      p_is_review_question: false,
      p_time_spent_ms: payload.timeSpentMs,
      p_status: payload.newStatus,
      p_rep_count: payload.newRepCount,
      p_next_review_session: payload.nextReviewSession,
      p_mastery_score: payload.masteryScore ?? null,
      p_total_questions_seen: payload.totalQuestionsSeen ?? null,
      p_last_reviewed_session: payload.chunkId ? payload.sessionNumber : null,
      p_updated_at: payload.chunkId ? new Date().toISOString() : null,
    }),
    `${FUNC} error`,
    { questionId: payload.questionId, chunkId: payload.chunkId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  const progressId = result.data?.[0]?.progress_id;
  if (!progressId) {
    throw createError(
      undefined,
      'Atomic quiz submission returned no progress id'
    );
  }

  return { success: true, progressId };
}

/**
 * Kullanıcı quiz ilerlemesini (teşhis/yanıt kaydı) kaydeder.
 *
 * @param payload - Veritabanı Insert objesi
 * @returns Progress ID veya hata
 */
export async function recordQuizProgress(
  payload: Database['public']['Tables']['user_quiz_progress']['Insert']
): Promise<{ success: boolean; progressId?: string; error?: Error }> {
  const FUNC = 'recordQuizProgress';

  if (!isValidUuid(payload.question_id)) return { success: true };

  const result = await safeQuery<{ id: string }>(
    supabase.from('user_quiz_progress').insert(payload).select('id').single(),
    `${FUNC} error`,
    { questionId: payload.question_id, ...payload }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return { success: true, progressId: result.data?.id };
}

/**
 * Kullanıcı soru durumunu (SRS statüsü, tekrar sayısı vb.) günceller.
 *
 * @param payload - Veritabanı Insert/Update objesi
 * @returns İşlem sonucu
 */
export async function upsertUserQuestionStatus(
  payload: Database['public']['Tables']['user_question_status']['Insert']
): Promise<GenericStatusResponse> {
  const FUNC = 'upsertUserQuestionStatus';

  if (!isValidUuid(payload.question_id)) return { success: true };

  const result = await safeQuery(
    supabase
      .from('user_question_status')
      .upsert(payload, { onConflict: 'user_id,question_id' }),
    `${FUNC} error`,
    { questionId: payload.question_id, ...payload, _type: 'upsert_status' }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return { success: true };
}

/**
 * Chunk bazlı mastery (ustalık) skorunu günceller.
 *
 * @param payload - Veritabanı Insert/Update objesi
 * @returns İşlem sonucu
 */
export async function upsertChunkMastery(
  payload: Database['public']['Tables']['chunk_mastery']['Insert']
): Promise<GenericStatusResponse> {
  const FUNC = 'upsertChunkMastery';

  const result = await safeQuery(
    supabase
      .from('chunk_mastery')
      .upsert(payload, { onConflict: 'user_id,chunk_id' }),
    `${FUNC} error`,
    { chunkId: payload.chunk_id, ...payload, _type: 'upsert_mastery' }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return { success: true };
}

/**
 * Chunk'ın AI işlem/üretim durumunu günceller.
 *
 * @param chunkId - Ünite ID'si
 * @param status - Yeni statü
 * @returns İşlem sonucu
 */
export async function updateChunkStatus(
  chunkId: string,
  status: Database['public']['Enums']['chunk_generation_status']
): Promise<GenericStatusResponse> {
  const FUNC = 'updateChunkStatus';

  const result = await safeQuery<null>(
    supabase.from('note_chunks').update({ status }).eq('id', chunkId),
    `${FUNC} error`,
    { chunkId, status }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return { success: true };
}

/**
 * Quiz cevabını gönderir ve SRS mantığına göre tüm veritabanı kayıtlarını günceller.
 * Mastery hesaplaması, soru statüsü ve ilerleme kaydı bu fonksiyon içinde atomik (Promise.all) yönetilir.
 *
 * @param ctx - Bağlam { userId, courseId, sessionNumber }
 * @param questionId - Soru ID'si
 * @param chunkId - Ünite ID'si (opsiyonel)
 * @param responseType - Yanıt tipi (doğru, yanlış vb.)
 * @param timeSpentMs - Harcanan süre (ms)
 * @param selectedAnswer - Seçilen seçeneğin indeksi
 * @returns Submission sonucu ve yeni SRS verileri
 */
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

  let totalQuestionsSeen: number | undefined;
  if (targetChunkId) {
    const { newMastery, newTotalSeen } = calculateAggregateMastery({
      currentMastery: masteryData?.mastery_score ?? 0,
      totalQuestionsSeen: masteryData?.total_questions_seen ?? 0,
      oldRepCount: currentStatus ? currentStatus.rep_count : -1,
      newRepCount: result.newRepCount,
    });

    totalQuestionsSeen = newTotalSeen;
    result.newMastery = newMastery;
  }

  const submissionWrite = await applyQuizSubmissionTransaction({
    userId: ctx.userId,
    questionId: validated.questionId,
    chunkId: targetChunkId,
    courseId: ctx.courseId,
    responseType: validated.responseType,
    selectedAnswer: validated.selectedAnswer,
    sessionNumber: ctx.sessionNumber,
    timeSpentMs: validated.timeSpentMs,
    newStatus: result.newStatus,
    newRepCount: result.newRepCount,
    nextReviewSession: result.nextReviewSession,
    masteryScore: targetChunkId ? result.newMastery : undefined,
    totalQuestionsSeen,
  });

  if (submissionWrite.progressId) {
    result.progressId = submissionWrite.progressId;
  }

  return result;
}

/**
 * Chunk'un AI logic alanını (kotalar vb.) veritabanında günceller.
 * @param chunkId - Chunk kimliği
 * @param aiLogic - Güncellenecek nesne
 */
export async function updateChunkAILogic(
  chunkId: string,
  aiLogic: Json
): Promise<{ error: Error | null; count: number | null }> {
  const FUNC = 'updateChunkAILogic';

  const result = await safeQuery(
    supabase
      .from('note_chunks')
      .update({ ai_logic: aiLogic })
      .eq('id', chunkId),
    `${FUNC} error`,
    { chunkId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return { error: null, count: result.count ?? 0 };
}
