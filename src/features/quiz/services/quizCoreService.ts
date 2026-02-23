import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { type Json } from '@/types/database.types';
import { handleSupabaseError, safeQuery } from '@/lib/supabaseHelpers';
import {
  type ChunkMasteryRow,
  QuizQuestionSchema,
} from '@/features/quiz/types';
import type { CourseTopic } from '@/features/courses/types/courseTypes';
import { isValidUuid, parseOrThrow } from '@/utils/validation';

const quizLogger = logger.withPrefix('[QuizCoreService]');

// --- Course & Session Core Services ---

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

export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    quizLogger.error('Auth user error', error);
    return null;
  }
  return user?.id || null;
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
  if (!isValidUuid(chunkId)) return [];
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

// --- Note Chunk & Topic Services ---

/**
 * Get a note chunk by ID.
 *
 * @param chunkId Chunk ID (must be valid UUID)
 * @returns Chunk data or null
 */
export async function getNoteChunkById(chunkId: string) {
  // Basic UUID validation to prevent Postgres errors
  if (!isValidUuid(chunkId)) {
    quizLogger.warn(`Invalid UUID passed to getNoteChunkById: ${chunkId}`);
    return null;
  }

  const { data, error } = await supabase
    .from('note_chunks')
    .select('content, metadata, ai_logic, course:courses(course_slug)')
    .eq('id', chunkId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      // Ignore single row not found errors
      await handleSupabaseError(error, 'getNoteChunkById');
    }
    return null;
  }
  return data;
}

/**
 * Get all topics (chunks) for a course.
 *
 * @param userId User ID
 * @param courseId Course ID
 * @returns Array of course topics
 */
export async function getCourseTopics(
  userId: string,
  courseId: string | null,
  signal?: AbortSignal
): Promise<CourseTopic[]> {
  if (!courseId) return [];

  // 1. Get all chunks for this course (sorted by chunk_order)
  let query = supabase
    .from('note_chunks')
    .select(
      'id, created_at, course_id, course_name, section_title, chunk_order, content, status, last_synced_at, metadata, ai_logic'
    )
    .eq('course_id', courseId)
    .order('chunk_order', { ascending: true });

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data: chunks, error: chunksError } = await query;

  if (chunksError) {
    await handleSupabaseError(chunksError, 'getCourseTopics');
    return [];
  }

  if (!chunks || chunks.length === 0) return [];

  return chunks.map((c) => ({
    ...c,
    questionCount: 0,
  })) as CourseTopic[];
}

/**
 * Convert course slug to course ID.
 *
 * @param slug Course slug
 * @returns Course ID or null if not found
 */
export async function getCourseIdBySlug(
  slug: string,
  _signal?: AbortSignal
): Promise<string | null> {
  const query = supabase
    .from('courses')
    .select('id')
    .eq('course_slug', slug)
    .limit(1)
    .maybeSingle();

  const { data, error } = await query;

  if (error || !data) {
    quizLogger.warn(`Course not found for slug: ${slug}`, {
      error: error?.message,
    });
    return null;
  }
  return data.id;
}

/**
 * Get unique topic names for a course.
 *
 * @param courseId Course ID
 * @returns Array of unique topic names
 */
export async function getUniqueCourseTopics(courseId: string) {
  const { data, error } = await supabase
    .from('note_chunks')
    .select('section_title')
    .eq('course_id', courseId)
    .order('section_title');

  if (error) {
    await handleSupabaseError(error, 'getUniqueCourseTopics');
    return [];
  }

  // Deduplicate section titles
  const titles = data.map((d) => d.section_title).filter(Boolean);
  return Array.from(new Set(titles));
}

/**
 * Get the first chunk ID for a topic.
 *
 * @param courseId Course ID
 * @param topic Topic name
 * @returns First chunk ID or null
 */
export async function getFirstChunkIdForTopic(courseId: string, topic: string) {
  const { data, error } = await supabase
    .from('note_chunks')
    .select('id')
    .eq('course_id', courseId)
    .eq('section_title', topic)
    .limit(1)
    .maybeSingle();

  if (error) {
    await handleSupabaseError(error, 'getFirstChunkIdForTopic');
    return null;
  }
  return data?.id || null;
}

/**
 * Get all questions for a specific topic.
 *
 * @param courseId Course ID
 * @param topic Topic name
 * @returns Array of questions
 */
export async function getTopicQuestions(courseId: string, topic: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*, course:courses(course_slug)')
    .eq('course_id', courseId)
    .eq('section_title', topic)
    .order('created_at', { ascending: true });

  if (error) {
    await handleSupabaseError(error, 'getTopicQuestions');
    return [];
  }

  // Map to QuizQuestion type
  return (data || []).map((q: unknown) => {
    const qData = parseOrThrow(
      QuizQuestionSchema,
      (q as { question_data: Json }).question_data
    );
    const courseSlug = (q as { course?: { course_slug: string } | null }).course
      ?.course_slug;

    return {
      q: qData.q,
      o: qData.o,
      a: qData.a,
      exp: qData.exp,
      img: qData.img,
      imgPath:
        qData.img && courseSlug ? `/notes/${courseSlug}/media/` : undefined,
    };
  });
}

export async function fetchCourseChunks(courseId: string) {
  const { data } = await safeQuery<
    { id: string; metadata: Json; ai_logic: Json; content: string }[]
  >(
    supabase
      .from('note_chunks')
      .select('id, metadata, ai_logic, content')
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
  if (!isValidUuid(questionId)) return null;

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
  if (!isValidUuid(chunkId)) return null;
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
  ai_logic: Json;
  status: string;
  content: string;
} | null> {
  if (!isValidUuid(chunkId)) return null;
  const { data } = await safeQuery<{
    course_id: string;
    metadata: Json;
    ai_logic: Json;
    status: string;
    content: string;
  }>(
    supabase
      .from('note_chunks')
      .select('course_id, metadata, ai_logic, status, content')
      .eq('id', chunkId)
      .single(),
    'getChunkMetadata error',
    { chunkId }
  );
  return data ?? null;
}

export async function getChunkWithContent(chunkId: string) {
  if (!isValidUuid(chunkId)) return null;
  const { data } = await safeQuery<Record<string, unknown>>(
    supabase
      .from('note_chunks')
      .select(
        'id, course_id, metadata, status, content, course_name, section_title, ai_logic'
      )
      .eq('id', chunkId)
      .single(),
    'getChunkWithContent error',
    { chunkId }
  );

  if (!data) return null;
  return data;
}
