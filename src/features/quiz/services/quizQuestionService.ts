import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { type Database, type Json } from '@/types/database.types';
import { safeQuery } from '@/lib/supabaseHelpers';
import { z } from 'zod';
import { isValidUuid, parseArray } from '@/utils/validation';
import {
  PartialQuestionRowSchema,
  type QuestionWithStatus,
  QuestionWithStatusRowSchema,
  type QuizQuestion,
  type RepositoryQuestion,
} from '@/features/quiz/types';
import { MASTERY_THRESHOLD } from '@/features/quiz/utils/constants';

const quizLogger = logger.withPrefix('[QuizQuestionService]');

export async function getTotalQuestionsInCourse(
  courseId: string
): Promise<number> {
  if (!isValidUuid(courseId)) return 0;
  const { count } = await safeQuery(
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId),
    'getTotalQuestionsInCourse error',
    { courseId }
  );
  return count || 0;
}

export async function getChunkQuestionCount(chunkId: string): Promise<number> {
  if (!isValidUuid(chunkId)) return 10;
  const { count } = await safeQuery(
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('chunk_id', chunkId),
    'getChunkQuestionCount error',
    { chunkId }
  );
  return count || 10;
}

export async function getArchivedQuestionsCount(
  userId: string,
  courseId: string
): Promise<number> {
  const { count } = await safeQuery(
    supabase
      .from('user_question_status')
      .select('id, questions!inner(course_id)', {
        count: 'exact',
        head: true,
      })
      .eq('user_id', userId)
      .eq('status', 'archived')
      .eq('questions.course_id', courseId),
    'getArchivedQuestionsCount error',
    { userId, courseId }
  );
  return count || 0;
}

export async function getSolvedQuestionIds(
  userId: string,
  chunkId: string
): Promise<Set<string>> {
  if (!isValidUuid(chunkId)) return new Set();
  const { data } = await safeQuery<{ question_id: string }[]>(
    supabase
      .from('user_quiz_progress')
      .select('question_id')
      .eq('user_id', userId)
      .eq('chunk_id', chunkId),
    'getSolvedQuestionIds error',
    { userId, chunkId }
  );

  return new Set(data?.map((s) => s.question_id) || []);
}

export async function getUniqueSolvedCountInChunk(
  userId: string,
  chunkId: string
): Promise<number> {
  if (!isValidUuid(chunkId)) return 0;
  const { count } = await safeQuery(
    supabase
      .from('user_question_status')
      .select('question_id, questions!inner(chunk_id)', {
        count: 'exact',
        head: true,
      })
      .eq('user_id', userId)
      .eq('questions.chunk_id', chunkId)
      .in('status', ['archived', 'pending_followup']),
    'getUniqueSolvedCountInChunk error',
    { userId, chunkId }
  );
  return count || 0;
}

export async function fetchPrerequisiteQuestions(
  courseId: string,
  concepts: string[],
  limit: number
) {
  const { data } = await safeQuery<
    {
      id: string;
      chunk_id: string | null;
      concept_title: string | null;
      bloom_level: string | null;
    }[]
  >(
    supabase
      .from('questions')
      .select('id, chunk_id, concept_title, bloom_level')
      .eq('course_id', courseId)
      .in('concept_title', concepts)
      .limit(limit),
    'fetchPrerequisiteQuestions error',
    { courseId, concepts }
  );
  return data || [];
}

export async function fetchGeneratedQuestions(
  chunkId: string,
  usageType: Database['public']['Enums']['question_usage_type'],
  limit: number
) {
  if (!isValidUuid(chunkId)) return [];
  const { data } = await safeQuery<{ id: string; question_data: Json }[]>(
    supabase
      .from('questions')
      .select('id, question_data')
      .eq('chunk_id', chunkId)
      .eq('usage_type', usageType)
      .order('created_at', { ascending: false })
      .limit(limit),
    'fetchGeneratedQuestions error',
    { chunkId, usageType }
  );
  return data || [];
}

export async function fetchQuestionsByChunk(
  chunkId: string,
  limit: number,
  excludeIds: Set<string>
): Promise<z.infer<typeof PartialQuestionRowSchema>[]> {
  const { data } = await safeQuery<unknown[]>(
    supabase
      .from('questions')
      .select(
        'id, chunk_id, question_data, bloom_level, concept_title, usage_type'
      )
      .eq('chunk_id', chunkId)
      .limit(limit + excludeIds.size),
    'fetchQuestionsByChunk error',
    { chunkId }
  );

  if (!data) return [];

  const parsed = parseArray(PartialQuestionRowSchema, data, {
    onError: (err, idx) =>
      quizLogger.warn(`Invalid question row at index ${idx}`, {
        error: err,
      }),
  });

  return parsed.filter((q) => !excludeIds.has(q.id)).slice(0, limit);
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

  const { data } = await safeQuery<unknown[]>(
    query,
    'fetchQuestionsByStatus error',
    { userId, courseId, status }
  );

  return parseArray(QuestionWithStatusRowSchema, data || [], {
    onError: (err, idx) =>
      quizLogger.warn(`Invalid question status row at index ${idx}`, {
        error: err,
      }),
  }) as QuestionWithStatus[];
}

export async function fetchQuestionsByCourse(
  courseId: string,
  limit: number = 10
): Promise<RepositoryQuestion[]> {
  const { data } = await safeQuery<RepositoryQuestion[]>(
    supabase
      .from('questions')
      .select(
        'id, chunk_id, question_data, bloom_level, concept_title, usage_type, course:courses(course_slug), chunk:note_chunks(section_title)'
      )
      .eq('course_id', courseId)
      .limit(limit),
    'fetchQuestionsByCourse error',
    { courseId }
  );
  return data || [];
}

export async function fetchQuestionsByIds(
  ids: string[]
): Promise<RepositoryQuestion[]> {
  if (ids.length === 0) return [];
  const { data } = await safeQuery<RepositoryQuestion[]>(
    supabase
      .from('questions')
      .select(
        'id, chunk_id, question_data, bloom_level, concept_title, usage_type, course:courses(course_slug), chunk:note_chunks(section_title)'
      )
      .in('id', ids),
    'fetchQuestionsByIds error',
    { ids }
  );
  return data || [];
}

export async function getQuestionData(
  questionId: string
): Promise<RepositoryQuestion | null> {
  if (!isValidUuid(questionId)) return null;
  const { data } = await safeQuery<RepositoryQuestion>(
    supabase
      .from('questions')
      .select(
        'id, chunk_id, question_data, bloom_level, concept_title, usage_type'
      )
      .eq('id', questionId)
      .single(),
    'getQuestionData error',
    { questionId }
  );
  return data;
}

export async function fetchCachedQuestion(
  chunkId: string,
  usageType: string,
  conceptTitle: string
): Promise<RepositoryQuestion | null> {
  const { data } = await safeQuery<RepositoryQuestion>(
    supabase
      .from('questions')
      .select('id, chunk_id, question_data, bloom_level, concept_title')
      .eq('chunk_id', chunkId)
      .ilike('concept_title', conceptTitle.trim())
      // @ts-expect-error - Supabase type inference issue
      .eq('usage_type', usageType)
      .maybeSingle(),
    'fetchCachedQuestion error',
    { chunkId, usageType, conceptTitle }
  );
  return data;
}

export async function getAntrenmanQuestionCount(
  chunkId: string
): Promise<number> {
  const { count } = await safeQuery(
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('chunk_id', chunkId)
      .eq('usage_type', 'antrenman'),
    'getAntrenmanQuestionCount error',
    { chunkId }
  );
  return count || 0;
}

export async function fetchActiveQuestionsFromChunk(
  userId: string,
  chunkId: string,
  limit: number
): Promise<QuestionWithStatus[]> {
  if (!isValidUuid(chunkId)) return [];
  const { data } = await safeQuery<unknown[]>(
    supabase
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
      .eq('questions.usage_type', 'antrenman')
      .limit(limit),
    'fetchActiveQuestionsFromChunk error',
    { userId, chunkId }
  );

  return parseArray(
    QuestionWithStatusRowSchema,
    data || []
  ) as QuestionWithStatus[];
}

export async function fetchNullQuestionsFromChunk(
  chunkId: string,
  limit: number
): Promise<QuestionWithStatus[]> {
  if (!isValidUuid(chunkId)) return [];
  const { data } = await safeQuery<unknown[]>(
    supabase
      .from('questions')
      .select(
        `
          id, chunk_id, course_id, parent_question_id, question_data,
          user_question_status!left (id)
        `
      )
      .eq('chunk_id', chunkId)
      .eq('usage_type', 'antrenman')
      .is('user_question_status.id', null)
      .limit(limit),
    'fetchNullQuestionsFromChunk error',
    { chunkId }
  );

  const typedData = (data || []) as {
    id: string;
    chunk_id: string;
    course_id: string;
    parent_question_id: string | null;
    question_data: unknown;
  }[];

  return typedData.map(
    (q): QuestionWithStatus => ({
      question_id: q.id,
      status: 'active',
      next_review_session: null,
      questions: {
        id: q.id,
        chunk_id: q.chunk_id,
        course_id: q.course_id,
        parent_question_id: q.parent_question_id,
        question_data: q.question_data as QuizQuestion,
      },
    })
  );
}

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
    if (!isValidUuid(chunkId)) return [];
    const activeQuestions = await fetchActiveQuestionsFromChunk(
      userId,
      chunkId,
      currentLimit
    );
    const remainingLimit = currentLimit - activeQuestions.length;
    let nullQuestions: QuestionWithStatus[] = [];

    if (remainingLimit > 0) {
      nullQuestions = await fetchNullQuestionsFromChunk(
        chunkId,
        remainingLimit
      );
    }

    return [...activeQuestions, ...nullQuestions];
  };

  const targetResults = isValidUuid(targetChunkId)
    ? await getFromChunk(targetChunkId, limit)
    : [];
  results.push(...targetResults);

  if (results.length >= limit) return results.slice(0, limit);

  const { data: weakChunks } = await safeQuery<{ chunk_id: string }[]>(
    supabase
      .from('chunk_mastery')
      .select('chunk_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .filter(
        'chunk_id',
        'neq',
        isValidUuid(targetChunkId)
          ? targetChunkId
          : '00000000-0000-0000-0000-000000000000'
      )
      .lt('mastery_score', MASTERY_THRESHOLD)
      .order('updated_at', { ascending: false }),
    'fetchWaterfallTrainingQuestions weakChunks error',
    { userId, courseId }
  );

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

export async function fetchNewFollowups(courseId: string, limit: number) {
  const { data } = await safeQuery<unknown[]>(
    supabase
      .from('questions')
      .select(
        `
          id, chunk_id, course_id, parent_question_id, question_data,
          user_question_status!left (status)
        `
      )
      .eq('course_id', courseId)
      .eq('usage_type', 'antrenman')
      .not('parent_question_id', 'is', null)
      .or(`status.is.null`, { foreignTable: 'user_question_status' })
      .limit(limit),
    'fetchNewFollowups error',
    { courseId }
  );

  return data || [];
}

/**
 * Get quota status for a specific chunk.
 *
 * @param chunkId Chunk ID
 * @returns Quota status information
 */
export async function getChunkQuotaStatus(chunkId: string): Promise<{
  used: number;
  quota: { total: number };
  isFull: boolean;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  conceptCount: number;
}> {
  const { data: chunkData } = await safeQuery<{
    ai_logic: { concept_map?: { length: number } } | null;
  }>(
    supabase.from('note_chunks').select('ai_logic').eq('id', chunkId).single(),
    'getChunkQuotaStatus error',
    { chunkId }
  );

  const conceptCount =
    (Array.isArray(chunkData?.ai_logic?.concept_map)
      ? chunkData.ai_logic.concept_map.length
      : 0) || 5;

  const { count: existingCount } = await safeQuery(
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('chunk_id', chunkId),
    'getChunkQuotaStatus count error',
    { chunkId }
  );

  const total = conceptCount * 3; // Default: 3 questions per concept
  const used = existingCount || 0;

  return {
    used,
    quota: { total },
    isFull: used >= total,
    status: 'COMPLETED',
    conceptCount,
  };
}
