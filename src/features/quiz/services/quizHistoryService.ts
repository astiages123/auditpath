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
import { getCourseName, getFrontierChunkId } from './quizCourseService';
import { fetchNewFollowups, fetchQuestionsByStatus } from './quizReadService';
import { fetchWaterfallTrainingQuestions } from './quizGenerationService';
import { incrementCourseSession } from './quizSubmissionService';

const MODULE = 'QuizHistoryService';

type QuizProgressRow = {
  course_id: string;
  session_number: number | null;
  response_type: string | null;
  answered_at: string | null;
  course: { name: string } | null;
};

type InsightProgressRow = {
  id: string;
  course_id: string;
  question_id: string;
  ai_diagnosis: string | null;
  ai_insight: string | null;
  response_type: string | null;
  answered_at: string | null;
};

type StatusRow = {
  question_id: string;
  rep_count: number | null;
};

function throwQueryError(func: string, error: string | undefined): never {
  const errorObject = new Error(error || `${func} failed`);
  logger.error(MODULE, func, 'Hata:', errorObject);
  throw errorObject;
}

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

  const result = await safeQuery<QuizProgressRow[]>(
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

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  if (!result.data) return [];

  const sessionsMap = new Map<string, RecentQuizSession>();

  result.data.forEach((row) => {
    const sessionNumber = row.session_number || 0;
    const key = `${row.course_id}-${sessionNumber}`;

    if (!sessionsMap.has(key)) {
      sessionsMap.set(key, {
        uniqueKey: key,
        courseName: row.course?.name || 'Kavram Testi',
        sessionNumber,
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

    if (row.answered_at && new Date(row.answered_at) > new Date(session.date)) {
      session.date = row.answered_at;
    }
  });

  return Array.from(sessionsMap.values())
    .map((session) => ({
      ...session,
      successRate:
        session.total > 0
          ? Math.round((session.correct / session.total) * 100)
          : 0,
    }))
    .sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime()
    )
    .slice(0, limit);
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

  const progressResult = await safeQuery<InsightProgressRow[]>(
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

  if (!progressResult.success) {
    throwQueryError(FUNC, progressResult.error);
  }

  if (!progressResult.data) return [];

  const questionIds = Array.from(
    new Set(progressResult.data.map((progressItem) => progressItem.question_id))
  );

  const statusResult = await safeQuery<StatusRow[]>(
    supabase
      .from('user_question_status')
      .select('question_id, rep_count')
      .eq('user_id', userId)
      .in('question_id', questionIds),
    `${FUNC} statusData error`,
    { userId }
  );

  if (!statusResult.success) {
    throwQueryError(FUNC, statusResult.error);
  }

  const repMap = new Map<string, number>();
  statusResult.data?.forEach((statusItem) =>
    repMap.set(statusItem.question_id, statusItem.rep_count || 0)
  );

  return progressResult.data.map((progressItem) => ({
    id: progressItem.id,
    courseId: progressItem.course_id,
    questionId: progressItem.question_id,
    diagnosis: progressItem.ai_diagnosis,
    insight: progressItem.ai_insight,
    consecutiveFails: repMap.get(progressItem.question_id) || 0,
    responseType: progressItem.response_type,
    date: progressItem.answered_at || new Date().toISOString(),
  }));
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
  const sessionInfo = await incrementCourseSession(userId, courseId);
  const courseName = await getCourseName(courseId);

  if (!sessionInfo.data) {
    throw sessionInfo.error || new Error('Failed to start session');
  }

  return {
    userId,
    courseId,
    courseName: courseName || '',
    sessionNumber: sessionInfo.data.current_session,
    isNewSession: sessionInfo.data.is_new_session,
  };
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
  const queue: ReviewItem[] = [];
  const usedIds = new Set<string>();

  const addItems = (
    questions: QuestionWithStatus[],
    status: 'active' | 'reviewing' | 'mastered'
  ) => {
    questions.forEach((question) => {
      if (usedIds.has(question.question_id) || queue.length >= limit) return;

      usedIds.add(question.question_id);
      queue.push({
        questionId: question.question_id,
        chunkId: question.questions?.chunk_id || undefined,
        status,
      });
    });
  };

  if (targetChunkId) {
    const reviewQuestions = await fetchQuestionsByStatus(
      ctx.userId,
      ctx.courseId,
      'reviewing',
      ctx.sessionNumber,
      limit
    );
    addItems(reviewQuestions, 'reviewing');
  } else {
    const frontierChunkId = await getFrontierChunkId(ctx.userId, ctx.courseId);
    const reviewQuestions = await fetchQuestionsByStatus(
      ctx.userId,
      ctx.courseId,
      'reviewing',
      ctx.sessionNumber,
      limit
    );
    addItems(reviewQuestions, 'reviewing');

    if (queue.length < limit && frontierChunkId) {
      const trainingQuestions = await fetchWaterfallTrainingQuestions(
        ctx.userId,
        ctx.courseId,
        frontierChunkId,
        limit - queue.length
      );
      addItems(trainingQuestions, 'active');
    }

    if (queue.length < limit) {
      const followUps = await fetchNewFollowups(
        ctx.courseId,
        limit - queue.length
      );
      followUps.forEach((followUpQuestion) => {
        const questionId =
          typeof followUpQuestion === 'object' &&
          followUpQuestion !== null &&
          'id' in followUpQuestion
            ? String(followUpQuestion.id)
            : null;

        if (!questionId || usedIds.has(questionId) || queue.length >= limit) {
          return;
        }

        usedIds.add(questionId);
        queue.push({
          questionId,
          chunkId:
            typeof followUpQuestion === 'object' &&
            followUpQuestion !== null &&
            'chunk_id' in followUpQuestion
              ? (followUpQuestion.chunk_id as string | null) || undefined
              : undefined,
          status: 'active',
        });
      });
    }
  }

  return queue.slice(0, limit);
}
