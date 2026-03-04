import { supabase } from '@/lib/supabase';
import { type RepositoryQuestion } from '@/features/quiz/types';
import { safeQuery } from '@/lib/supabaseHelpers';
import { type Database, type Json } from '@/types/database.types';
import { logger } from '@/utils/logger';
import { isValidUuid } from '@/utils/validation';

const MODULE = 'QuizRepository';

/** quizParser tarafından oluşturulan yeni soruyu veritabanına kaydeder */
export async function createQuestion(
  payload: Database['public']['Tables']['questions']['Insert']
): Promise<{ error: Error | null }> {
  try {
    const { error } = await safeQuery(
      supabase.from('questions').insert([payload]),
      'createQuestion error'
    );
    return { error: error ? new Error(String(error)) : null };
  } catch (error) {
    logger.error(MODULE, 'createQuestion', 'Hata:', error);
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/** Belirli bir chunk, kullanım türü ve konsept başlığı için önceden sorulmuş soru var mı kontrol eder */
export async function fetchCachedQuestion(
  chunk_id: string,
  usage_type: 'antrenman' | 'deneme',
  concept_title: string
): Promise<boolean> {
  try {
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
  } catch (error) {
    logger.error(MODULE, 'fetchCachedQuestion', 'Hata:', error);
    return false;
  }
}

/** Belirli bir chunk ve kullanım tipi için üretilen soruları getirir */
export async function fetchGeneratedQuestions(
  chunkId: string,
  usageType: Database['public']['Enums']['question_usage_type'],
  limit: number
) {
  try {
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
      'fetchGeneratedQuestions error',
      { chunkId, usageType }
    );
    return data || [];
  } catch (error) {
    logger.error(MODULE, 'fetchGeneratedQuestions', 'Hata:', error);
    return [];
  }
}

/** Belirli bir kurs için genel soru listesi getirir */
export async function fetchQuestionsByCourse(
  courseId: string,
  limit: number = 10
) {
  try {
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
  } catch (error) {
    logger.error(MODULE, 'fetchQuestionsByCourse', 'Hata:', error);
    return [];
  }
}
