import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { safeQuery } from '@/lib/supabaseHelpers';
import { isValidUuid, parseArray, parseOrThrow } from '@/utils/validation';
import {
  type QuestionWithStatus,
  QuestionWithStatusRowSchema,
  type QuizQuestion,
  QuizQuestionSchema,
  type RepositoryQuestion,
} from '@/features/quiz/types';

const MODULE = 'QuizReadService';

/** Kurstaki toplam soru sayısını getirir */
export async function getTotalQuestionsInCourse(
  courseId: string
): Promise<number> {
  const FUNC = 'getTotalQuestionsInCourse';
  try {
    if (!isValidUuid(courseId)) return 0;
    const { count } = await safeQuery(
      supabase
        .from('questions')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('course_id', courseId),
      `${FUNC} error`,
      { courseId }
    );
    return count || 0;
  } catch (error) {
    logger.error(MODULE, FUNC, 'Hata:', error);
    return 0;
  }
}

/** Belirli bir konuya (topic/chunk) ait tüm soruları getirir */
export async function getTopicQuestions(
  courseId: string,
  topic: string
): Promise<QuizQuestion[]> {
  const FUNC = 'getTopicQuestions';
  try {
    const { data, success } = await safeQuery<RepositoryQuestion[]>(
      supabase
        .from('questions')
        .select('*, course:courses(course_slug)')
        .eq('course_id', courseId)
        .eq('section_title', topic)
        .order('created_at', { ascending: true }),
      `${FUNC} error`,
      { courseId, topic }
    );
    if (!success || !data) return [];
    return data.map((q) => {
      const qData = parseOrThrow(QuizQuestionSchema, q.question_data);
      const courseSlug = q.course?.course_slug;
      return {
        type: 'multiple_choice',
        q: qData.q,
        o: qData.o,
        a: qData.a,
        exp: qData.exp,
        img: qData.img,
        imgPath:
          qData.img && courseSlug ? `/notes/${courseSlug}/media/` : undefined,
      } as QuizQuestion;
    });
  } catch (error) {
    logger.error(MODULE, FUNC, 'Hata:', error);
    return [];
  }
}

/** Kullanıcının belirli bir sorudaki durum bilgisini getirir */
export async function getUserQuestionStatus(
  userId: string,
  questionId: string
) {
  const FUNC = 'getUserQuestionStatus';
  try {
    if (!isValidUuid(questionId)) return null;
    const { data } = await safeQuery<{
      question_id: string;
      status: 'active' | 'reviewing' | 'mastered';
      rep_count: number;
      next_review_session: number | null;
    }>(
      supabase
        .from('user_question_status')
        .select('question_id, status, rep_count, next_review_session')
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .maybeSingle(),
      `${FUNC} error`,
      { userId, questionId }
    );
    if (!data) return null;
    return {
      question_id: data.question_id,
      status: data.status,
      rep_count: data.rep_count ?? 0,
      next_review_session: data.next_review_session,
    };
  } catch (error) {
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

/** Belirli bir chunk için üretilmiş toplam soru sayısını getirir */
export async function getChunkQuestionCount(chunkId: string): Promise<number> {
  const FUNC = 'getChunkQuestionCount';
  try {
    if (!isValidUuid(chunkId)) return 0;
    const { count } = await safeQuery(
      supabase
        .from('questions')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('chunk_id', chunkId),
      `${FUNC} error`,
      { chunkId }
    );
    return count || 0;
  } catch (error) {
    logger.error(MODULE, FUNC, 'Hata:', error);
    return 0;
  }
}

/** Durum bazlı soruları getirir */
export async function fetchQuestionsByStatus(
  userId: string,
  courseId: string,
  status: 'reviewing' | 'active' | 'mastered',
  maxSession: number | null,
  limit: number
): Promise<QuestionWithStatus[]> {
  const FUNC = 'fetchQuestionsByStatus';
  try {
    let query = supabase
      .from('user_question_status')
      .select(
        `question_id, status, next_review_session, questions!inner (id, chunk_id, course_id, parent_question_id, question_data)`
      )
      .eq('user_id', userId)
      .eq('questions.course_id', courseId)
      .eq('status', status)
      .eq('questions.usage_type', 'antrenman');
    if (maxSession !== null) {
      query = query.lte('next_review_session', maxSession);
    }
    query = query.order('updated_at', { ascending: true }).limit(limit);
    const { data } = await safeQuery<unknown[]>(query, `${FUNC} error`, {
      userId,
      courseId,
      status,
    });
    return parseArray(
      QuestionWithStatusRowSchema,
      data || []
    ) as QuestionWithStatus[];
  } catch (error) {
    logger.error(MODULE, FUNC, 'Hata:', error);
    return [];
  }
}

/** Belirli soru ID listesine göre soru verilerini getirir */
export async function fetchQuestionsByIds(
  ids: string[]
): Promise<RepositoryQuestion[]> {
  const FUNC = 'fetchQuestionsByIds';
  try {
    if (ids.length === 0) return [];
    const { data } = await safeQuery<RepositoryQuestion[]>(
      supabase
        .from('questions')
        .select(
          'id, chunk_id, question_data, bloom_level, concept_title, usage_type, course:courses(course_slug), chunk:note_chunks(section_title)'
        )
        .in('id', ids),
      `${FUNC} error`,
      { ids }
    );
    return data || [];
  } catch (error) {
    logger.error(MODULE, FUNC, 'Hata:', error);
    return [];
  }
}

/** Tek bir sorunun verisini getirir */
export async function getQuestionData(
  questionId: string
): Promise<RepositoryQuestion | null> {
  const FUNC = 'getQuestionData';
  try {
    if (!isValidUuid(questionId)) return null;
    const { data } = await safeQuery<RepositoryQuestion>(
      supabase
        .from('questions')
        .select(
          'id, chunk_id, question_data, bloom_level, concept_title, usage_type'
        )
        .eq('id', questionId)
        .single(),
      `${FUNC} error`,
      { questionId }
    );
    return data ?? null;
  } catch (error) {
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

/** Kullanıcının belirli bir kursta ustalaştığı soru sayısını getirir */
export async function getMasteredQuestionsCount(
  userId: string,
  courseId: string
): Promise<number> {
  const FUNC = 'getMasteredQuestionsCount';
  try {
    if (!isValidUuid(courseId)) return 0;
    const { count } = await safeQuery(
      supabase
        .from('user_question_status')
        .select('question_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'mastered')
        .eq('questions.course_id', courseId),
      `${FUNC} error`,
      { userId, courseId }
    );
    return count || 0;
  } catch (error) {
    logger.error(MODULE, FUNC, 'Hata:', error);
    return 0;
  }
}

/** Henüz çözülmemiş (yeni seans için bekleyen) takip sorularını getirir */
export async function fetchNewFollowups(
  courseId: string,
  limit: number
): Promise<unknown[]> {
  const FUNC = 'fetchNewFollowups';
  try {
    if (!isValidUuid(courseId)) return [];
    const { data } = await safeQuery<unknown[]>(
      supabase
        .from('questions')
        .select('*')
        .eq('course_id', courseId)
        .not('parent_question_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit),
      `${FUNC} error`,
      { courseId }
    );
    return data || [];
  } catch (error) {
    logger.error(MODULE, FUNC, 'Hata:', error);
    return [];
  }
}
