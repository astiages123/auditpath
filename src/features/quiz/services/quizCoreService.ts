import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { safeQuery } from '@/lib/supabaseHelpers';
import { isValidUuid } from '@/utils/validation';
import {
  type ChunkMasteryRow,
  type ValidatedChunkWithContent,
} from '@/features/quiz/types';
import type { CourseTopic } from '@/features/courses/types/courseTypes';

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE = 'QuizCoreService';

// ============================================================================
// CORE SERVICES
// ============================================================================

/**
 * Kurs ID bazlı kurs adını getirir.
 *
 * @param courseId - Kursun UUID'si
 * @returns Kurs adı veya null
 */
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

/**
 * Mevcut auth session token bilgisini döndürür.
 * API isteklerinde yetkilendirme için kullanılır.
 *
 * @returns Erişim token'ı veya null
 */
export async function getCurrentSessionToken(): Promise<string | null> {
  const FUNC = 'getCurrentSessionToken';
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error(`[${MODULE}][${FUNC}] Auth session error:`, error);
      logger.error(MODULE, FUNC, 'Auth session error', error);
      return null;
    }
    return data.session?.access_token || null;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

/**
 * Mevcut giriş yapmış kullanıcının ID bilgisini döndürür.
 *
 * @returns Kullanıcı ID'si veya null
 */
export async function getCurrentUserId(): Promise<string | null> {
  const FUNC = 'getCurrentUserId';
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error(`[${MODULE}][${FUNC}] Auth user error:`, error);
      logger.error(MODULE, FUNC, 'Auth user error', error);
      return null;
    }
    return user?.id || null;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

/**
 * Kursun en son çalışılan (frontier) chunk ID bilgisini getirir.
 * Kullanıcının nerede kaldığını takip etmek için kullanılır.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns Son çalışılan ünite ID'si veya null
 */
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

/**
 * Kullanıcının belirli bir ünite için son AI teşhislerini (diagnoses) getirir.
 *
 * @param userId - Kullanıcı ID'si
 * @param chunkId - Ünite ID'si
 * @param limit - Getirilecek kayıt sayısı
 * @returns Teşhis metinleri listesi
 */
export async function getRecentDiagnoses(
  userId: string,
  chunkId: string,
  limit: number
): Promise<string[]> {
  const FUNC = 'getRecentDiagnoses';
  try {
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
      `${FUNC} error`,
      { userId, chunkId }
    );

    return (data || [])
      .map((p) => p.ai_diagnosis)
      .filter((d): d is string => Boolean(d));
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return [];
  }
}

/**
 * Kurs için mastery ve genel istatistik özetini getirir.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns Mastery puanları ve görülen soru sayıları
 */
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

// ============================================================================
// NOTE CHUNK & TOPIC SERVICES
// ============================================================================

export interface NoteChunkData {
  content: string;
  metadata: Record<string, unknown>;
  ai_logic: Record<string, unknown>;
  course: { course_slug: string };
}

/**
 * ID bazlı note chunk verisini getirir.
 *
 * @param chunkId - Ünite ID'si
 * @returns Ünite verisi veya null
 */
export async function getNoteChunkById(
  chunkId: string
): Promise<NoteChunkData | null> {
  const FUNC = 'getNoteChunkById';
  try {
    if (!isValidUuid(chunkId)) {
      console.warn(`[${MODULE}][${FUNC}] Geçersiz UUID: ${chunkId}`);
      logger.warn(MODULE, FUNC, `Invalid UUID passed: ${chunkId}`);
      return null;
    }

    const { data, success } = await safeQuery<NoteChunkData>(
      supabase
        .from('note_chunks')
        .select('content, metadata, ai_logic, course:courses(course_slug)')
        .eq('id', chunkId)
        .maybeSingle(),
      `${FUNC} error`,
      { chunkId }
    );

    if (!success) return null;
    return data ?? null;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

/**
 * Bir kursa ait tüm konuları (chunk) getirir.
 *
 * @param _userId - Kullanıcı ID'si (Kullanılmıyor, geriye dönük uyumluluk)
 * @param courseId - Kurs ID'si
 * @param signal - AbortSignal (opsiyonel)
 * @returns Konu listesi
 */
export async function getCourseTopics(
  _userId: string,
  courseId: string | null,
  signal?: AbortSignal
): Promise<CourseTopic[]> {
  const FUNC = 'getCourseTopics';
  try {
    if (!courseId) return [];

    let query = supabase
      .from('note_chunks')
      .select(
        'id, created_at, course_id, course_name, section_title, chunk_order, content, status, last_synced_at, metadata, ai_logic'
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

    const { data: chunks, success } = await safeQuery<
      Record<string, unknown>[]
    >(query, `${FUNC} error`, { courseId });

    if (!success || !chunks) return [];

    return chunks.map((c) => ({
      ...c,
      questionCount: 0,
    })) as CourseTopic[];
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return [];
  }
}

/**
 * Course slug bilgisinden course ID değerini bulur.
 *
 * @param slug - Kurs slug bilgisi (örn: "fizik-101")
 * @returns Kurs UUID'si veya null
 */
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

/**
 * Bir chunk ID için mastery (ustalık) bilgisini getirir.
 * Kullanıcının bu ünitedeki ilerlemesini ve başarısını döner.
 *
 * @param userId - Kullanıcı ID'si
 * @param chunkId - Ünite ID'si
 * @returns Mastery kaydı veya null
 */
export async function getChunkMastery(
  userId: string,
  chunkId: string
): Promise<ChunkMasteryRow | null> {
  const FUNC = 'getChunkMastery';
  try {
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
      `${FUNC} error`,
      { userId, chunkId }
    );

    if (!data) return null;

    return {
      chunk_id: data.chunk_id,
      user_id: userId,
      mastery_score: data.mastery_score,
      last_full_review_at: data.last_full_review_at,
      total_questions_seen: data.total_questions_seen ?? 0,
    };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

/**
 * Bir chunk ID için içerik ve metadata bilgisini getirir.
 *
 * @param chunkId - Ünite ID'si
 * @returns Onaylanmış ünite içeriği veya null
 */
export async function getChunkWithContent(
  chunkId: string
): Promise<ValidatedChunkWithContent | null> {
  const FUNC = 'getChunkWithContent';
  try {
    if (!isValidUuid(chunkId)) return null;
    const { data } = await safeQuery<ValidatedChunkWithContent>(
      supabase
        .from('note_chunks')
        .select(
          'id, course_id, metadata, status, content, course_name, section_title, ai_logic'
        )
        .eq('id', chunkId)
        .single(),
      `${FUNC} error`,
      { chunkId }
    );

    if (!data) return null;
    return data;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

/**
 * Belirli bir konu adı (section_title) için ilk chunk ID bilgisini getirir.
 * Konu bazlı quiz başlatırken giriş noktası olarak kullanılır.
 *
 * @param courseId - Kurs ID'si
 * @param topicName - Konu başlığı
 * @returns Ünite ID'si veya null
 */
export async function getFirstChunkIdForTopic(
  courseId: string,
  topicName: string
): Promise<string | null> {
  const FUNC = 'getFirstChunkIdForTopic';
  try {
    const { data } = await safeQuery<{ id: string }>(
      supabase
        .from('note_chunks')
        .select('id')
        .eq('course_id', courseId)
        .eq('section_title', topicName)
        .order('chunk_order', { ascending: true })
        .limit(1)
        .maybeSingle(),
      `${FUNC} error`,
      { courseId, topicName }
    );
    return data?.id || null;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}
