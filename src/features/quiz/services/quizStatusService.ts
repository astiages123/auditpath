import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { safeQuery } from '@/lib/supabaseHelpers';
import { isValidUuid } from '@/utils/validation';
import { type TopicCompletionStats } from '@/features/courses/types/courseTypes';
import { type QuotaStatus } from '@/features/quiz/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE = 'QuizStatusService';

// ============================================================================
// TYPES
// ============================================================================

interface ChunkTopicData {
  id: string;
  section_title: string;
  ai_logic: unknown;
}

interface TopicStatus {
  id: string;
  title: string;
  mastery: number;
  isCompleted: boolean;
}

interface CourseCompletionData {
  total: number;
  completed: number;
  topics: TopicStatus[];
}

interface CourseTopicCount {
  id: string;
  title: string;
  count: number;
}

// ============================================================================
// STATUS & PROGRESS SERVICES
// ============================================================================

/**
 * Kullanıcının konuya (topic) özgü kota sınırını ve ilerlemesini hesaplar.
 *
 * @param userId - Kullanıcı ID'si (opsiyonel)
 * @param chunkId - Konu (chunk) ID'si
 * @returns Kullanılan kota, toplam kota ve kavram sayısı
 */
export async function calculateTopicQuota(
  userId: string | undefined,
  chunkId: string
): Promise<{ used: number; total: number; conceptCount: number }> {
  const FUNC = 'calculateTopicQuota';
  try {
    if (!isValidUuid(chunkId)) return { used: 0, total: 0, conceptCount: 0 };

    // 1. Chunk metriklerinden hedeflenen soru sayısını al
    const { data: chunk } = await safeQuery<{
      ai_logic: Record<string, unknown> | null;
    }>(
      supabase
        .from('note_chunks')
        .select('ai_logic')
        .eq('id', chunkId)
        .single(),
      `${FUNC} chunk error`,
      { chunkId }
    );

    const aiLogic = chunk?.ai_logic as
      | {
          suggested_quotas?: { antrenman?: number };
          concept_map?: unknown[];
        }
      | undefined;
    const targetTotal = aiLogic?.suggested_quotas?.antrenman || 10;
    const conceptCount = aiLogic?.concept_map?.length || 0;

    // 2. Kullanıcının bu chunk için çözdüğü benzersiz soru sayısını al
    let count = 0;
    if (userId) {
      const { count: c } = await safeQuery(
        supabase
          .from('user_quiz_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('chunk_id', chunkId),
        `${FUNC} progress count error`,
        { userId, chunkId }
      );
      count = c || 0;
    }

    return {
      used: count,
      total: targetTotal,
      conceptCount,
    };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { used: 0, total: 10, conceptCount: 0 };
  }
}

/**
 * Kurs genelindeki konu bazlı tamamlama durumlarını getirir.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns Toplam konu, tamamlanan konu ve konu detayları
 */
export async function getCourseCompletionStatus(
  userId: string,
  courseId: string
): Promise<CourseCompletionData> {
  const FUNC = 'getCourseCompletionStatus';
  try {
    // 1. Kursun tüm konularını (chunks) al
    const { data: chunks } = await safeQuery<ChunkTopicData[]>(
      supabase
        .from('note_chunks')
        .select('id, section_title, ai_logic')
        .eq('course_id', courseId),
      `${FUNC} chunks error`,
      { courseId }
    );

    if (!chunks) return { total: 0, completed: 0, topics: [] };

    // 2. Kullanıcının mastery skorlarını al
    const { data: mastery } = await safeQuery<
      { chunk_id: string; mastery_score: number }[]
    >(
      supabase
        .from('chunk_mastery')
        .select('chunk_id, mastery_score')
        .eq('user_id', userId)
        .eq('course_id', courseId),
      `${FUNC} mastery error`,
      { userId, courseId }
    );

    const masteryMap = new Map(
      mastery?.map((m) => [m.chunk_id, m.mastery_score])
    );

    const topicStatus: TopicStatus[] = chunks.map((c) => {
      const score = masteryMap.get(c.id) || 0;
      return {
        id: c.id,
        title: c.section_title,
        mastery: score,
        isCompleted: score >= 80, // %80 başarı eşiği
      };
    });

    return {
      total: chunks.length,
      completed: topicStatus.filter((t) => t.isCompleted).length,
      topics: topicStatus,
    };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { total: 0, completed: 0, topics: [] };
  }
}

/**
 * Kurs genelindeki ilerlemeyi (total, solved, percentage) getirir.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns İlerleme özeti objesi
 */
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<{ total: number; solved: number; percentage: number } | null> {
  const FUNC = 'getCourseProgress';
  try {
    const status = await getCourseCompletionStatus(userId, courseId);
    const percentage =
      status.total > 0
        ? Math.round((status.completed / status.total) * 100)
        : 0;

    return {
      total: status.total,
      solved: status.completed,
      percentage,
    };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

/**
 * Kursa ait konuları (chunks) ve her konudaki soru sayılarını getirir.
 *
 * @param courseId - Kurs ID'si
 * @returns Konular ve soru sayıları
 */
export async function getCourseTopicsWithCounts(
  courseId: string
): Promise<CourseTopicCount[]> {
  const FUNC = 'getCourseTopicsWithCounts';
  try {
    const { data } = await safeQuery<
      { id: string; section_title: string; questions: { count: number }[] }[]
    >(
      supabase
        .from('note_chunks')
        .select('id, section_title, questions(count)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true }),
      `${FUNC} error`,
      { courseId }
    );

    return (
      data?.map((c) => ({
        id: c.id,
        title: c.section_title,
        count: c.questions?.[0]?.count || 0,
      })) || []
    );
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return [];
  }
}

/**
 * Belirli bir konunun (topic) detaylı tamamlama durumunu (kota, mevcut soru vb.) getirir.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @param topicName - Konu başlığı
 * @returns Konu tamamlama istatistikleri
 */
export async function getTopicCompletionStatus(
  userId: string,
  courseId: string,
  topicName: string
): Promise<TopicCompletionStats> {
  const FUNC = 'getTopicCompletionStatus';
  try {
    // 1. Konuya (chunk) ait metadata ve ai_logic bilgilerini al
    const { data: chunk } = await safeQuery<{
      id: string;
      ai_logic: Record<string, unknown> | null;
    }>(
      supabase
        .from('note_chunks')
        .select('id, ai_logic')
        .eq('course_id', courseId)
        .eq('section_title', topicName)
        .single(),
      `${FUNC} chunk error`,
      { courseId, topicName }
    );

    const chunkId = chunk?.id;
    const aiLogic =
      (chunk?.ai_logic as {
        concept_map?: import('@/features/quiz/types').ConceptMapItem[];
        suggested_quotas?: { antrenman?: number; deneme?: number };
      }) || {};
    const concepts = aiLogic?.concept_map || [];
    const quotas = aiLogic?.suggested_quotas || { antrenman: 10, deneme: 5 };
    const antrenmanQuota = quotas.antrenman || 10;
    const denemeQuota = quotas.deneme || 5;

    // 2. Mevcut soru sayılarını (user_quiz_progress üzerinden) al
    let antrenmanCount = 0;
    let denemeCount = 0;

    if (chunkId) {
      const { count: ac } = await safeQuery(
        supabase
          .from('user_quiz_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('chunk_id', chunkId),
        `${FUNC} antrenman count error`,
        { userId, chunkId }
      );

      const { count: dc } = await safeQuery(
        supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('chunk_id', chunkId)
          .eq('usage_type', 'deneme'),
        `${FUNC} deneme count error`,
        { chunkId }
      );

      antrenmanCount = ac || 0;
      denemeCount = dc || 0;
    }

    return {
      completed: antrenmanCount >= antrenmanQuota,
      antrenman: {
        solved: antrenmanCount,
        total: antrenmanQuota,
        quota: antrenmanQuota,
        existing: antrenmanCount,
      },
      deneme: {
        solved: denemeCount,
        total: denemeQuota,
        quota: denemeQuota,
        existing: denemeCount,
      },
      mistakes: {
        solved: 0,
        total: 0,
        existing: 0,
      },
      aiLogic: aiLogic as Record<string, unknown>,
      concepts,
    };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return {
      completed: false,
      antrenman: { solved: 0, total: 10, quota: 10, existing: 0 },
      deneme: { solved: 0, total: 5, quota: 5, existing: 0 },
      mistakes: { solved: 0, total: 0, existing: 0 },
      aiLogic: {},
      concepts: [],
    };
  }
}

/**
 * Belirli bir chunk için kota durumunu (QuotaStatus) getirir.
 *
 * @param chunkId - Konu (chunk) ID'si
 * @param userId - Kullanıcı ID'si (opsiyonel)
 * @returns Kota durumu nesnesi
 */
export async function getChunkQuotaStatus(
  chunkId: string,
  userId?: string
): Promise<QuotaStatus | null> {
  const FUNC = 'getChunkQuotaStatus';
  try {
    const quota = await calculateTopicQuota(userId, chunkId);

    // Status belirleme (basit mantık: soru varsa completed, yoksa pending)
    let status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'COMPLETED';
    if (quota.used === 0) status = 'PENDING';
    else if (quota.used < quota.total) status = 'PROCESSING';

    return {
      used: quota.used,
      quota: { total: quota.total },
      isFull: quota.used >= quota.total,
      status: status,
      conceptCount: quota.conceptCount,
    };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

/**
 * Kullanıcı için kurs bazlı oturum bilgilerini (mevcut oturum no vb.) getirir.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns Oturum bilgisi nesnesi
 */
export async function getSessionInfo(
  userId: string,
  courseId: string
): Promise<{
  currentSession: number;
  totalSessions: number;
  courseId: string;
} | null> {
  const FUNC = 'getSessionInfo';
  try {
    const { data } = await safeQuery<{ current_session: number }>(
      supabase
        .from('course_session_counters')
        .select('current_session')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle(),
      `${FUNC} error`,
      { userId, courseId }
    );

    const currentSession = data?.current_session || 1;

    return {
      currentSession,
      totalSessions: currentSession,
      courseId,
    };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

/**
 * Kullanıcının kurstaki genel kota bilgilerini getirir.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns Kota bilgisi nesnesi
 */
export async function getQuotaInfo(
  _userId: string,
  _courseId: string
): Promise<{ reviewQuota: number } | null> {
  const FUNC = 'getQuotaInfo';
  try {
    // Şimdilik sabit 10 dönüyoruz, ileride dinamik olabilir
    return {
      reviewQuota: 10,
    };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return { reviewQuota: 10 };
  }
}
