import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import { logger } from '@/utils/logger';
import {
  type CognitiveInsight,
  type QuestionWithStatus,
  type RecentQuizSession,
  type ReviewItem,
  type SessionContext,
} from '@/features/quiz/types';
import { getCourseName, getFrontierChunkId } from './quizCoreService';
import {
  fetchNewFollowups,
  fetchQuestionsByStatus,
  fetchWaterfallTrainingQuestions,
} from './quizQuestionService';
import { incrementCourseSession } from './quizSubmissionService';

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE = 'QuizHistoryService';

// ============================================================================
// HISTORY & SESSION SERVICES
// ============================================================================

/**
 * Kullanıcının son quiz oturumlarını (seanslarını) getirir.
 * Çoklu tablo verisinden (user_quiz_progress + courses) seans özetlerini derler.
 *
 * @param userId - Kullanıcı ID'si
 * @param limit - Getirilecek seans sayısı
 * @returns Seans özetleri listesi
 */
export async function getRecentQuizSessions(
  userId: string,
  limit: number = 5
): Promise<RecentQuizSession[]> {
  const FUNC = 'getRecentQuizSessions';
  try {
    interface QuizProgressRow {
      course_id: string;
      session_number: number | null;
      response_type: string | null;
      answered_at: string | null;
      course: { name: string } | null;
    }

    const { data: rawData } = await safeQuery<QuizProgressRow[]>(
      supabase
        .from('user_quiz_progress')
        .select(
          `
                  course_id,
                  session_number,
                  response_type,
                  answered_at,
                  course:courses(name)
              `
        )
        .eq('user_id', userId)
        .order('answered_at', { ascending: false })
        .limit(500),
      `${FUNC} error`,
      { userId }
    );

    if (!rawData) return [];

    const sessionsMap = new Map<string, RecentQuizSession>();

    rawData.forEach((row) => {
      const sNum = row.session_number || 0;
      const key = `${row.course_id}-${sNum}`;

      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          uniqueKey: key,
          courseName: row.course?.name || 'Kavram Testi',
          sessionNumber: sNum,
          date: row.answered_at || new Date().toISOString(),
          correct: 0,
          incorrect: 0,
          blank: 0,
          total: 0,
          successRate: 0,
        });
      }

      const session = sessionsMap.get(key)!;
      session.total++;
      if (row.response_type === 'correct') session.correct++;
      else if (row.response_type === 'incorrect') session.incorrect++;
      else session.blank++;

      if (
        row.answered_at &&
        new Date(row.answered_at) > new Date(session.date)
      ) {
        session.date = row.answered_at;
      }
    });

    return Array.from(sessionsMap.values())
      .map((s) => ({
        ...s,
        successRate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return [];
  }
}

/**
 * Kullanıcı için son bilişsel içgörüleri ve soru teşhislerini getirir.
 *
 * @param userId - Kullanıcı ID'si
 * @param limit - Getirilecek kayıt sayısı
 * @returns Bilişsel içgörü listesi
 */
export async function getRecentCognitiveInsights(
  userId: string,
  limit: number = 30
): Promise<CognitiveInsight[]> {
  const FUNC = 'getRecentCognitiveInsights';
  try {
    interface ProgressRow {
      id: string;
      course_id: string;
      question_id: string;
      ai_diagnosis: string | null;
      ai_insight: string | null;
      response_type: string | null;
      answered_at: string | null;
    }

    const { data: progressData } = await safeQuery<ProgressRow[]>(
      supabase
        .from('user_quiz_progress')
        .select(
          'id, course_id, question_id, ai_diagnosis, ai_insight, response_type, answered_at'
        )
        .eq('user_id', userId)
        .or('ai_diagnosis.neq.null,ai_insight.neq.null')
        .order('answered_at', { ascending: false })
        .limit(limit),
      `${FUNC} progressData error`,
      { userId }
    );

    if (!progressData) return [];

    const questionIds = Array.from(
      new Set(progressData.map((p) => p.question_id))
    );

    interface StatusRow {
      question_id: string;
      rep_count: number | null;
    }

    const { data: statusData } = await safeQuery<StatusRow[]>(
      supabase
        .from('user_question_status')
        .select('question_id, rep_count')
        .eq('user_id', userId)
        .in('question_id', questionIds),
      `${FUNC} statusData error`,
      { userId }
    );

    const repMap = new Map<string, number>();
    if (statusData) {
      statusData.forEach((s) => repMap.set(s.question_id, s.rep_count || 0));
    }

    return progressData.map((p) => ({
      id: p.id,
      courseId: p.course_id,
      questionId: p.question_id,
      diagnosis: p.ai_diagnosis,
      insight: p.ai_insight,
      consecutiveFails: repMap.get(p.question_id) || 0,
      responseType: p.response_type,
      date: p.answered_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return [];
  }
}

/**
 * Quiz oturumunu (seansını) başlatır ve gerekli seans bağlamını (context) hazırlar.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns Seans bağlamı (ID, seans no vb.)
 */
export async function startQuizSession(
  userId: string,
  courseId: string
): Promise<SessionContext> {
  const FUNC = 'startQuizSession';
  try {
    const sessionInfo = await incrementCourseSession(userId, courseId);
    const courseName = await getCourseName(courseId);

    if (!sessionInfo.data) {
      console.error(
        `[${MODULE}][${FUNC}] Seans başlatılamadı:`,
        sessionInfo.error
      );
      throw new Error(sessionInfo.error?.message || 'Failed to start session');
    }

    return {
      userId,
      courseId,
      courseName: courseName || '',
      sessionNumber: sessionInfo.data.current_session,
      isNewSession: sessionInfo.data.is_new_session,
    };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    throw error;
  }
}

/**
 * Mevcut seans için soru havuzunu (tekrar, eğitim, mastered) derler.
 * SRS mantığına göre önceliklendirme yapar (Review > Training > Mastered).
 *
 * @param ctx - Seans bağlamı
 * @param limit - Havuza eklenecek maksimum soru sayısı
 * @param targetChunkId - Hedef ünite ID'si (opsiyonel, ünite bazlı quiz için)
 * @returns Önceliklendirilmiş soru referansları
 */
export async function getReviewQueue(
  ctx: SessionContext,
  limit: number = 20,
  targetChunkId?: string
): Promise<ReviewItem[]> {
  const FUNC = 'getReviewQueue';
  try {
    const queue: ReviewItem[] = [];
    const usedIds = new Set<string>();

    /** Helper: Soruları kuyruğa ekle ve tekilleştir */
    const addItems = (
      qs: QuestionWithStatus[],
      stat: 'active' | 'reviewing' | 'mastered',
      priority: number
    ) => {
      qs.forEach((q) => {
        const qId = q.questions?.id || q.question_id;
        if (!usedIds.has(qId)) {
          queue.push({
            chunkId: q.questions?.chunk_id || '',
            questionId: qId,
            courseId: ctx.courseId,
            status: stat,
            priority,
          });
          usedIds.add(qId);
        }
      });
    };

    // 1. Tekrar edilmesi gereken sorular (Reviewing)
    const followups = await fetchQuestionsByStatus(
      ctx.userId,
      ctx.courseId,
      'reviewing',
      ctx.sessionNumber,
      targetChunkId ? 100 : Math.ceil(limit * 0.2)
    );
    addItems(followups, 'reviewing', 1);

    // 2. Yeni/Aktif takip soruları (Follow-ups)
    const remainingFollowupQuota = targetChunkId
      ? 50
      : Math.ceil(limit * 0.2) - queue.length;

    if (remainingFollowupQuota > 0) {
      const newFollowupsRaw = await fetchNewFollowups(
        ctx.courseId,
        remainingFollowupQuota
      );

      const newFollowups: QuestionWithStatus[] = newFollowupsRaw.map(
        (q: unknown) => {
          const raw = q as {
            id: string;
            chunk_id: string | null;
            course_id: string;
            parent_question_id: string | null;
            question_data: unknown;
          };
          return {
            question_id: raw.id,
            status: 'active' as const,
            next_review_session: null,
            questions: {
              id: raw.id,
              chunk_id: raw.chunk_id,
              course_id: raw.course_id,
              parent_question_id: raw.parent_question_id,
              question_data:
                raw.question_data as import('@/features/quiz/types').QuizQuestion,
            },
          };
        }
      );
      addItems(newFollowups, 'active', 1);
    }

    // 3. Eğitim soruları (Waterfall/Frontier)
    const effectiveChunkId =
      targetChunkId ||
      (await getFrontierChunkId(ctx.userId, ctx.courseId)) ||
      undefined;

    if (effectiveChunkId) {
      const trainingQs = await fetchWaterfallTrainingQuestions(
        ctx.userId,
        ctx.courseId,
        effectiveChunkId,
        targetChunkId ? 1000 : Math.ceil(limit * 0.7)
      );
      addItems(trainingQs, 'active', 2);
    }

    // 4. Arşiv soruları (Mastered - tazeleme için)
    const archiveQs = await fetchQuestionsByStatus(
      ctx.userId,
      ctx.courseId,
      'mastered',
      ctx.sessionNumber,
      targetChunkId ? 100 : Math.ceil(limit * 0.1)
    );
    addItems(archiveQs, 'mastered', 3);

    return targetChunkId ? queue : queue.slice(0, limit);
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return [];
  }
}
