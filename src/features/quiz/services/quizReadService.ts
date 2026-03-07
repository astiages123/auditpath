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

function throwQueryError(func: string, error: string | undefined): never {
  const errorObject = new Error(error || `${func} failed`);
  logger.error(MODULE, func, 'Hata:', errorObject);
  throw errorObject;
}

/** Kurstaki toplam soru sayısını getirir */
export async function getTotalQuestionsInCourse(
  courseId: string
): Promise<number> {
  const FUNC = 'getTotalQuestionsInCourse';

  if (!isValidUuid(courseId)) return 0;

  const result = await safeQuery(
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

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return result.count || 0;
}

/** Belirli bir konuya (topic/chunk) ait tüm soruları getirir */
export async function getTopicQuestions(
  courseId: string,
  topic: string
): Promise<QuizQuestion[]> {
  const FUNC = 'getTopicQuestions';

  const result = await safeQuery<RepositoryQuestion[]>(
    supabase
      .from('questions')
      .select('*, course:courses(course_slug)')
      .eq('course_id', courseId)
      .eq('section_title', topic)
      .order('created_at', { ascending: true }),
    `${FUNC} error`,
    { courseId, topic }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  if (!result.data) return [];

  return result.data.map((question) => {
    const questionData = parseOrThrow(
      QuizQuestionSchema,
      question.question_data
    );
    const courseSlug = question.course?.course_slug;
    return {
      type: questionData.type,
      q: questionData.q,
      o: questionData.o,
      a: questionData.a,
      exp: questionData.exp,
      img: questionData.img,
      diagnosis: questionData.diagnosis,
      insight: questionData.insight,
      evidence: questionData.evidence,
      imgPath:
        questionData.img !== null &&
        questionData.img !== undefined &&
        courseSlug
          ? `/notes/${courseSlug}/media/`
          : undefined,
    } as QuizQuestion;
  });
}

/** Kullanıcının belirli bir sorudaki durum bilgisini getirir */
export async function getUserQuestionStatus(
  userId: string,
  questionId: string
) {
  const FUNC = 'getUserQuestionStatus';

  if (!isValidUuid(questionId)) return null;

  const result = await safeQuery<{
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

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  if (!result.data) return null;

  return {
    question_id: result.data.question_id,
    status: result.data.status,
    rep_count: result.data.rep_count ?? 0,
    next_review_session: result.data.next_review_session,
  };
}

/** Belirli bir chunk için üretilmiş toplam soru sayısını getirir */
export async function getChunkQuestionCount(chunkId: string): Promise<number> {
  const FUNC = 'getChunkQuestionCount';

  if (!isValidUuid(chunkId)) return 0;

  const result = await safeQuery(
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

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return result.count || 0;
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

  const result = await safeQuery<unknown[]>(query, `${FUNC} error`, {
    userId,
    courseId,
    status,
  });

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return parseArray(
    QuestionWithStatusRowSchema,
    result.data || []
  ) as QuestionWithStatus[];
}

/** Belirli soru ID listesine göre soru verilerini getirir */
export async function fetchQuestionsByIds(
  ids: string[]
): Promise<RepositoryQuestion[]> {
  const FUNC = 'fetchQuestionsByIds';

  if (ids.length === 0) return [];

  const result = await safeQuery<RepositoryQuestion[]>(
    supabase
      .from('questions')
      .select(
        'id, chunk_id, question_data, bloom_level, concept_title, usage_type, course:courses(course_slug), chunk:note_chunks(section_title)'
      )
      .in('id', ids),
    `${FUNC} error`,
    { ids }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return result.data || [];
}

/** Tek bir sorunun verisini getirir */
export async function getQuestionData(
  questionId: string
): Promise<RepositoryQuestion | null> {
  const FUNC = 'getQuestionData';

  if (!isValidUuid(questionId)) return null;

  const result = await safeQuery<RepositoryQuestion>(
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

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return result.data ?? null;
}

/** Kullanıcının belirli bir kursta ustalaştığı soru sayısını getirir */
export async function getMasteredQuestionsCount(
  userId: string,
  courseId: string
): Promise<number> {
  const FUNC = 'getMasteredQuestionsCount';

  if (!isValidUuid(courseId)) return 0;

  const result = await safeQuery(
    supabase
      .from('user_question_status')
      .select('question_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'mastered')
      .eq('questions.course_id', courseId),
    `${FUNC} error`,
    { userId, courseId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return result.count || 0;
}

/** Henüz çözülmemiş (yeni seans için bekleyen) takip sorularını getirir */
export async function fetchNewFollowups(
  courseId: string,
  limit: number
): Promise<unknown[]> {
  const FUNC = 'fetchNewFollowups';

  if (!isValidUuid(courseId)) return [];

  const result = await safeQuery<unknown[]>(
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

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return result.data || [];
}
