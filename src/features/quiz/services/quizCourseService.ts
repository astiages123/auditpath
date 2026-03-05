import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import { logger } from '@/utils/logger';

const MODULE = 'QuizCourseService';

export async function getCourseName(courseId: string): Promise<string | null> {
  const FUNC = 'getCourseName';
  try {
    const { data } = await safeQuery<{ name: string }>(
      supabase.from('courses').select('name').eq('id', courseId).single(),
      `${FUNC} error`,
      { courseId }
    );
    return data?.name || null;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

export async function getFrontierChunkId(
  userId: string,
  courseId: string
): Promise<string | null> {
  const FUNC = 'getFrontierChunkId';
  try {
    const { data } = await safeQuery<{ chunk_id: string }>(
      supabase
        .from('chunk_mastery')
        .select('chunk_id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      `${FUNC} error`,
      { userId, courseId }
    );
    return data?.chunk_id || null;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

export async function getCourseStatsAggregate(
  userId: string,
  courseId: string
): Promise<
  { total_questions_seen: number | null; mastery_score: number }[] | null
> {
  const FUNC = 'getCourseStatsAggregate';
  try {
    const { data: masteryData } = await safeQuery<
      { total_questions_seen: number | null; mastery_score: number }[]
    >(
      supabase
        .from('chunk_mastery')
        .select('total_questions_seen, mastery_score')
        .eq('user_id', userId)
        .eq('course_id', courseId),
      `${FUNC} error`,
      { userId, courseId }
    );
    return masteryData ?? null;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

export async function getCourseIdBySlug(slug: string): Promise<string | null> {
  const FUNC = 'getCourseIdBySlug';
  try {
    const query = supabase
      .from('courses')
      .select('id')
      .eq('course_slug', slug)
      .limit(1)
      .maybeSingle();

    const { data, success } = await safeQuery<{ id: string }>(
      query,
      'Course not found for slug',
      { slug }
    );

    if (!success || !data) {
      return null;
    }

    return data.id;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}
