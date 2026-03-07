import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import type { CourseTopic } from '@/features/courses/types/courseTypes';

/**
 * Kurs slug değerine göre kursun ID'sini getirir.
 *
 * @param slug - Kursun URL slug değeri.
 * @returns Kurs ID'si veya bulunamazsa null.
 */
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

/**
 * Belirli bir kursun tüm konu parçalarını (topics/chunks) getirir.
 *
 * @param _userId - Gelecekte kullanım için tutulan kullanıcı ID'si.
 * @param courseId - Kursun benzersiz ID'si.
 * @param signal - İstek iptali için signal.
 * @returns Konu listesi.
 */
export async function getCourseTopics(
  _userId: string,
  courseId: string | null,
  signal?: AbortSignal
): Promise<CourseTopic[]> {
  if (!courseId) return [];

  let query = supabase
    .from('note_chunks')
    .select(
      'id, created_at, course_id, course_name, section_title, chunk_order, status, last_synced_at, metadata, content'
    )
    .eq('course_id', courseId)
    .order('chunk_order', { ascending: true });

  if (signal) {
    query = (
      query as typeof query & {
        abortSignal: (s: AbortSignal) => typeof query;
      }
    ).abortSignal(signal);
  }

  const { data: chunks, success } = await safeQuery<Record<string, unknown>[]>(
    query,
    'getCourseTopics error',
    { courseId }
  );

  if (!success || !chunks) {
    return [];
  }

  return chunks.map((chunk) => ({
    ...chunk,
    questionCount: 0,
  })) as CourseTopic[];
}
