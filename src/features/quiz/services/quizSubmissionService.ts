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
import { calculateQuizResult } from '../logic/srsLogic';
import { getChunkMastery } from './quizCoreService';
import { getQuestionData, getUserQuestionStatus } from './quizQuestionService';

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE = 'QuizSubmissionService';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// SUBMISSION SERVICES
// ============================================================================

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
  try {
    const { success, error } = await safeQuery<null>(
      supabase.from('note_chunks').update({ metadata }).eq('id', chunkId),
      `${FUNC} error`,
      { chunkId }
    );

    if (!success) return { success: false, error: new Error(error) };
    return { success: true };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { success: false, error: error as Error };
  }
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
  try {
    return safeQuery<SessionResult[]>(
      supabase.rpc('increment_course_session', {
        p_user_id: userId,
        p_course_id: courseId,
      }),
      `${FUNC} error`,
      { userId, courseId }
    ).then(({ success, data, error }) => {
      if (!success) return { data: null, error: new Error(error) };
      if (Array.isArray(data) && data.length > 0) {
        return { data: data[0], error: null };
      }
      return { data: null, error: new Error('Unexpected RPC response format') };
    });
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { data: null, error: error as Error };
  }
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
  const FUNC = 'finishQuizSession';
  try {
    const { data, error } = await incrementCourseSession(
      stats.userId,
      stats.courseId
    );

    if (error || !data) {
      return {
        success: false,
        error: error || new Error('Failed to increment course session counter'),
      };
    }

    return { success: true, sessionComplete: true };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { success: false, error: error as Error };
  }
}

async function applyQuizSubmissionTransaction(
  payload: AtomicQuizSubmissionPayload
): Promise<{ success: boolean; progressId?: string; error?: Error }> {
  const FUNC = 'applyQuizSubmissionTransaction';
  try {
    const { success, data, error } = await safeQuery<{ progress_id: string }[]>(
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

    if (!success) return { success: false, error: new Error(error) };

    const progressId = data?.[0]?.progress_id;
    if (!progressId) {
      return {
        success: false,
        error: new Error('Atomic quiz submission returned no progress id'),
      };
    }

    return { success: true, progressId };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { success: false, error: error as Error };
  }
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
  try {
    if (!isValidUuid(payload.question_id)) return { success: true };

    const { success, data, error } = await safeQuery<{ id: string }>(
      supabase.from('user_quiz_progress').insert(payload).select('id').single(),
      `${FUNC} error`,
      { questionId: payload.question_id, ...payload }
    );

    if (!success) return { success: false, error: new Error(error) };
    return { success: true, progressId: data?.id };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { success: false, error: error as Error };
  }
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
  try {
    if (!isValidUuid(payload.question_id)) return { success: true };

    const { success, error } = await safeQuery(
      supabase
        .from('user_question_status')
        .upsert(payload, { onConflict: 'user_id,question_id' }),
      `${FUNC} error`,
      { questionId: payload.question_id, ...payload, _type: 'upsert_status' }
    );

    if (!success) return { success: false, error: new Error(error) };
    return { success: true };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { success: false, error: error as Error };
  }
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
  try {
    const { success, error } = await safeQuery(
      supabase
        .from('chunk_mastery')
        .upsert(payload, { onConflict: 'user_id,chunk_id' }),
      `${FUNC} error`,
      { chunkId: payload.chunk_id, ...payload, _type: 'upsert_mastery' }
    );

    if (!success) return { success: false, error: new Error(error) };
    return { success: true };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { success: false, error: error as Error };
  }
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
  try {
    const { success, error } = await safeQuery<null>(
      supabase.from('note_chunks').update({ status }).eq('id', chunkId),
      `${FUNC} error`,
      { chunkId, status }
    );

    if (!success) return { success: false, error: new Error(error) };
    return { success: true };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { success: false, error: error as Error };
  }
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
  const FUNC = 'submitQuizAnswer';
  try {
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

    // Mastery (Ustalık) hesaplaması ve güncellemesi
    let totalQuestionsSeen: number | undefined;
    if (targetChunkId) {
      const REP_TO_SCORE: Record<number, number> = {
        0: 0,
        1: 33,
        2: 66,
        3: 100,
      };
      const oldRepCount = currentStatus ? currentStatus.rep_count : -1;
      const oldScore =
        oldRepCount >= 0 ? (REP_TO_SCORE[Math.min(oldRepCount, 3)] ?? 100) : 0;
      const newScore = REP_TO_SCORE[Math.min(result.newRepCount, 3)] ?? 100;

      let totalQuestions = masteryData?.total_questions_seen ?? 0;
      const oldMastery = masteryData?.mastery_score ?? 0;
      const isNewQuestion = oldRepCount === -1;

      const currentTotalScore = oldMastery * totalQuestions;
      if (isNewQuestion) {
        totalQuestions += 1;
      }

      const newTotalScore = currentTotalScore - oldScore + newScore;
      const newMastery =
        totalQuestions > 0 ? Math.round(newTotalScore / totalQuestions) : 0;
      const cappedMastery = Math.min(100, Math.max(0, newMastery));
      totalQuestionsSeen = totalQuestions;
      result.newMastery = cappedMastery;
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

    if (!submissionWrite.success) {
      console.error(
        `[${MODULE}][${FUNC}] Transactional submission failed:`,
        submissionWrite.error
      );
      throw (
        submissionWrite.error ||
        new Error('Yanıt veritabanına kaydedilirken bir hata oluştu')
      );
    }

    if (submissionWrite.progressId) {
      result.progressId = submissionWrite.progressId;
    }

    return result;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    throw error;
  }
}

// === SECTION: CHUNK LOGIC SUBMISSION ===

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
  try {
    const { count, error } = await safeQuery(
      supabase
        .from('note_chunks')
        .update({ ai_logic: aiLogic })
        .eq('id', chunkId),
      `${FUNC} error`,
      { chunkId }
    );
    if (error) throw error;
    return { error: null, count: count ?? 0 };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    return { error: error as Error, count: null };
  }
}
