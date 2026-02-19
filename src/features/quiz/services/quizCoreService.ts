import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { type Json } from '@/types/database.types';
import { safeQuery } from '@/lib/supabaseHelpers';
import { type ChunkMasteryRow } from '@/features/quiz/types';

const quizLogger = logger.withPrefix('[QuizCoreService]');

export async function getCourseName(courseId: string): Promise<string | null> {
  const { data } = await safeQuery<{ name: string }>(
    supabase.from('courses').select('name').eq('id', courseId).single(),
    'getCourseName error',
    { courseId }
  );
  return data?.name || null;
}

export async function getCurrentSessionToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    quizLogger.error('Auth session error', error);
    return null;
  }
  return data.session?.access_token || null;
}

export async function getFrontierChunkId(
  userId: string,
  courseId: string
): Promise<string | null> {
  const { data } = await safeQuery<{ chunk_id: string }>(
    supabase
      .from('chunk_mastery')
      .select('chunk_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'getFrontierChunkId error',
    { userId, courseId }
  );

  return data?.chunk_id || null;
}

export async function getRecentDiagnoses(
  userId: string,
  chunkId: string,
  limit: number
): Promise<string[]> {
  const { data } = await safeQuery<{ ai_diagnosis: string | null }[]>(
    supabase
      .from('user_quiz_progress')
      .select('ai_diagnosis')
      .eq('user_id', userId)
      .eq('chunk_id', chunkId)
      .not('ai_diagnosis', 'is', null)
      .order('answered_at', { ascending: false })
      .limit(limit),
    'getRecentDiagnoses error',
    { userId, chunkId }
  );

  return (data || [])
    .map((p) => p.ai_diagnosis)
    .filter((d): d is string => Boolean(d));
}

export async function getCourseStatsAggregate(
  userId: string,
  courseId: string
) {
  const { data: masteryData } = await safeQuery<
    { total_questions_seen: number | null; mastery_score: number }[]
  >(
    supabase
      .from('chunk_mastery')
      .select('total_questions_seen, mastery_score')
      .eq('user_id', userId)
      .eq('course_id', courseId),
    'getCourseStatsAggregate error',
    { userId, courseId }
  );
  return masteryData;
}

export async function fetchCourseMastery(courseId: string, userId: string) {
  const { data } = await safeQuery<
    { chunk_id: string; mastery_score: number }[]
  >(
    supabase
      .from('chunk_mastery')
      .select('chunk_id, mastery_score')
      .eq('course_id', courseId)
      .eq('user_id', userId),
    'fetchCourseMastery error',
    { courseId, userId }
  );
  return data || [];
}

export async function fetchCourseChunks(courseId: string) {
  const { data } = await safeQuery<
    { id: string; metadata: Json; content: string }[]
  >(
    supabase
      .from('note_chunks')
      .select('id, metadata, content')
      .eq('course_id', courseId)
      .eq('status', 'COMPLETED'),
    'fetchCourseChunks error',
    { courseId }
  );
  return data || [];
}

export async function getUserQuestionStatus(
  userId: string,
  questionId: string
): Promise<{
  question_id: string;
  status: string;
  consecutive_success: number;
  consecutive_fails: number;
  next_review_session: number | null;
} | null> {
  const { data } = await safeQuery<{
    question_id: string;
    status: string;
    consecutive_success: number | null;
    consecutive_fails: number | null;
    next_review_session: number | null;
  }>(
    supabase
      .from('user_question_status')
      .select(
        'question_id, status, consecutive_success, consecutive_fails, next_review_session'
      )
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .maybeSingle(),
    'getUserQuestionStatus error',
    { userId, questionId }
  );

  if (!data) return null;

  return {
    question_id: data.question_id,
    status: data.status,
    consecutive_success: data.consecutive_success ?? 0,
    consecutive_fails: data.consecutive_fails ?? 0,
    next_review_session: data.next_review_session,
  };
}

export async function getChunkMastery(
  userId: string,
  chunkId: string
): Promise<ChunkMasteryRow | null> {
  const { data } = await safeQuery<{
    chunk_id: string;
    mastery_score: number;
    last_full_review_at: string | null;
    total_questions_seen: number | null;
  }>(
    supabase
      .from('chunk_mastery')
      .select(
        'chunk_id, mastery_score, last_full_review_at, total_questions_seen'
      )
      .eq('user_id', userId)
      .eq('chunk_id', chunkId)
      .maybeSingle(),
    'getChunkMastery error',
    { userId, chunkId }
  );

  if (!data) return null;

  return {
    chunk_id: data.chunk_id,
    user_id: userId,
    mastery_score: data.mastery_score,
    last_full_review_at: data.last_full_review_at,
    streak: 0,
    total_questions_seen: data.total_questions_seen ?? 0,
  };
}

export async function getChunkMetadata(chunkId: string): Promise<{
  course_id: string;
  metadata: Json;
  status: string;
  content: string;
} | null> {
  const { data } = await safeQuery<{
    course_id: string;
    metadata: Json;
    status: string;
    content: string;
  }>(
    supabase
      .from('note_chunks')
      .select('course_id, metadata, status, content')
      .eq('id', chunkId)
      .single(),
    'getChunkMetadata error',
    { chunkId }
  );
  return data;
}

export async function getChunkWithContent(chunkId: string) {
  const { data } = await safeQuery<Record<string, unknown>>(
    supabase
      .from('note_chunks')
      .select(
        'id, course_id, metadata, status, content, display_content, course_name, section_title, ai_logic'
      )
      .eq('id', chunkId)
      .single(),
    'getChunkWithContent error',
    { chunkId }
  );

  if (!data) return null;
  return data;
}

// Re-export from quizQuestionService for backwards compatibility
export {
  getChunkQuestionCount,
  getQuestionData,
  getUniqueSolvedCountInChunk,
  fetchGeneratedQuestions,
  fetchNewFollowups,
  fetchQuestionsByStatus,
  fetchWaterfallTrainingQuestions,
  getArchivedQuestionsCount,
  getTotalQuestionsInCourse,
} from './quizQuestionService';
