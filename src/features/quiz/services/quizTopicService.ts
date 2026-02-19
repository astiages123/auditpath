import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { handleSupabaseError } from '@/lib/supabaseHelpers';
import type { CourseTopic } from '@/features/courses/types/courseTypes';
import { parseOrThrow } from '@/utils/validation';
import { QuizQuestionSchema } from '@/features/quiz/types';
import type { Json } from '@/types/database.types';

/**
 * Get a note chunk by ID.
 *
 * @param chunkId Chunk ID (must be valid UUID)
 * @returns Chunk data or null
 */
export async function getNoteChunkById(chunkId: string) {
  // Basic UUID validation to prevent Postgres errors
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(chunkId)) {
    logger.warn(`Invalid UUID passed to getNoteChunkById: ${chunkId}`);
    return null;
  }

  const { data, error } = await supabase
    .from('note_chunks')
    .select('content, metadata, course:courses(course_slug)')
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
      'id, created_at, course_id, course_name, section_title, chunk_order, content, display_content, status, last_synced_at, metadata, ai_logic'
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
  }));
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
    logger.warn(`Course not found for slug: ${slug}`, {
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
