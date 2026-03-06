import { supabase } from '@/lib/supabase';
import { type RepositoryQuestion } from '@/features/quiz/types';
import { safeQuery } from '@/lib/supabaseHelpers';
import { type Database, type Json } from '@/types/database.types';
import { isValidUuid } from '@/utils/validation';

/** quizParser tarafından oluşturulan yeni soruyu veritabanına kaydeder */
export async function createQuestion(
  payload: Database['public']['Tables']['questions']['Insert']
): Promise<{ error: Error | null }> {
  const { error } = await safeQuery(
    supabase.from('questions').insert([payload]),
    'createQuestion error'
  );
  return { error: error ? new Error(String(error)) : null };
}

/** Belirli bir chunk, kullanım türü ve konsept başlığı için önceden sorulmuş soru var mı kontrol eder */
export async function fetchCachedQuestion(
  chunk_id: string,
  usage_type: 'antrenman' | 'deneme',
  concept_title: string
): Promise<boolean> {
  const { count } = await safeQuery(
    supabase
      .from('questions')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('chunk_id', chunk_id)
      .eq('usage_type', usage_type)
      .eq('concept_title', concept_title),
    'fetchCachedQuestion error',
    { chunk_id }
  );
  return (count || 0) > 0;
}

/** Belirli bir chunk ve kullanım tipi için üretilen soruları getirir */
export async function fetchGeneratedQuestionsByChunk(
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
      .order('created_at', {
        ascending: false,
      })
      .limit(limit),
    'fetchGeneratedQuestionsByChunk error',
    { chunkId, usageType }
  );
  return data || [];
}

/** Belirli bir kurs ve kullanım tipi için üretilen soruları getirir */
export async function fetchGeneratedQuestionsByCourse(
  courseId: string,
  usageType: Database['public']['Enums']['question_usage_type'],
  limit: number
) {
  if (!isValidUuid(courseId)) return [];
  const { data } = await safeQuery<{ id: string; question_data: Json }[]>(
    supabase
      .from('questions')
      .select('id, question_data')
      .eq('course_id', courseId)
      .eq('usage_type', usageType)
      .order('created_at', {
        ascending: false,
      })
      .limit(limit),
    'fetchGeneratedQuestionsByCourse error',
    { courseId, usageType }
  );
  return data || [];
}

/** Belirli bir kurs için genel soru listesi getirir */
export async function fetchQuestionsByCourse(
  courseId: string,
  limit: number = 10
) {
  const { data } = await safeQuery<RepositoryQuestion[]>(
    supabase
      .from('questions')
      .select(
        'id, chunk_id, course_id, parent_question_id, question_data, bloom_level, concept_title, usage_type, course:courses(course_slug), chunk:note_chunks(section_title)'
      )
      .eq('course_id', courseId)
      .eq('usage_type', 'antrenman')
      .limit(limit),
    'fetchQuestionsByCourse error',
    { courseId, limit }
  );
  return data || [];
}
