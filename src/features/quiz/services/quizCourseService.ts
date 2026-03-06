import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';

export async function getCourseName(courseId: string): Promise<string | null> {
  const { data } = await safeQuery<{ name: string }>(
    supabase.from('courses').select('name').eq('id', courseId).single(),
    'getCourseName error',
    { courseId }
  );
  return data?.name || null;
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

export async function getCourseStatsAggregate(
  userId: string,
  courseId: string
): Promise<
  { total_questions_seen: number | null; mastery_score: number }[] | null
> {
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
  return masteryData ?? null;
}

export async function getCourseIdBySlug(slug: string): Promise<string | null> {
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
}
