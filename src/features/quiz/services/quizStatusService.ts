import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { safeQuery } from '@/lib/supabaseHelpers';
import { isValidUuid } from '@/utils/validation';
import { type TopicCompletionStats } from '@/features/courses/types/courseTypes';
import { type QuotaStatus } from '@/features/quiz/types';

const MODULE = 'QuizStatusService';

interface ChunkTopicData {
  id: string;
  section_title: string;
  ai_logic?: unknown;
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

type NoteChunkAiLogic = {
  suggested_quotas?: { antrenman?: number; deneme?: number };
  concept_map?: import('@/features/quiz/types').ConceptMapItem[];
};

function throwQueryError(func: string, error: string | undefined): never {
  const errorObject = new Error(error || `${func} failed`);
  logger.error(MODULE, func, 'Hata:', errorObject);
  throw errorObject;
}

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

  if (!isValidUuid(chunkId)) return { used: 0, total: 0, conceptCount: 0 };

  const chunkResult = await safeQuery<{
    ai_logic: Record<string, unknown> | null;
  }>(
    supabase.from('note_chunks').select('ai_logic').eq('id', chunkId).single(),
    `${FUNC} chunk error`,
    { chunkId }
  );

  if (!chunkResult.success) {
    throwQueryError(FUNC, chunkResult.error);
  }

  const aiLogic = chunkResult.data?.ai_logic as
    | {
        suggested_quotas?: { antrenman?: number };
        concept_map?: unknown[];
      }
    | undefined;
  const targetTotal = aiLogic?.suggested_quotas?.antrenman || 10;
  const conceptCount = aiLogic?.concept_map?.length || 0;

  let count = 0;
  if (userId) {
    const progressResult = await safeQuery(
      supabase
        .from('user_quiz_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('chunk_id', chunkId),
      `${FUNC} progress count error`,
      { userId, chunkId }
    );

    if (!progressResult.success) {
      throwQueryError(FUNC, progressResult.error);
    }

    count = progressResult.count || 0;
  }

  return {
    used: count,
    total: targetTotal,
    conceptCount,
  };
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

  const chunksResult = await safeQuery<ChunkTopicData[]>(
    supabase
      .from('note_chunks')
      .select('id, section_title')
      .eq('course_id', courseId),
    `${FUNC} chunks error`,
    { courseId }
  );

  if (!chunksResult.success) {
    throwQueryError(FUNC, chunksResult.error);
  }

  const chunks = chunksResult.data;
  if (!chunks) return { total: 0, completed: 0, topics: [] };

  const masteryResult = await safeQuery<
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

  if (!masteryResult.success) {
    throwQueryError(FUNC, masteryResult.error);
  }

  const masteryMap = new Map(
    masteryResult.data?.map((masteryItem) => [
      masteryItem.chunk_id,
      masteryItem.mastery_score,
    ])
  );

  const topicStatus: TopicStatus[] = chunks.map((chunk) => {
    const score = masteryMap.get(chunk.id) || 0;
    return {
      id: chunk.id,
      title: chunk.section_title,
      mastery: score,
      isCompleted: score >= 80,
    };
  });

  return {
    total: chunks.length,
    completed: topicStatus.filter((topic) => topic.isCompleted).length,
    topics: topicStatus,
  };
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
  const status = await getCourseCompletionStatus(userId, courseId);
  const percentage =
    status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0;

  return {
    total: status.total,
    solved: status.completed,
    percentage,
  };
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

  const result = await safeQuery<
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

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return (
    result.data?.map((chunk) => ({
      id: chunk.id,
      title: chunk.section_title,
      count: chunk.questions?.[0]?.count || 0,
    })) || []
  );
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

  const chunkResult = await safeQuery<{
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

  if (!chunkResult.success) {
    throwQueryError(FUNC, chunkResult.error);
  }

  const chunkId = chunkResult.data?.id;
  const aiLogic = (chunkResult.data?.ai_logic as NoteChunkAiLogic) || {};
  const concepts = aiLogic.concept_map || [];
  const quotas = aiLogic.suggested_quotas || { antrenman: 10, deneme: 5 };
  const antrenmanQuota = quotas.antrenman || 10;
  const denemeQuota = quotas.deneme || 5;

  let antrenmanSolved = 0;
  let antrenmanPool = 0;
  let denemePool = 0;

  if (chunkId) {
    const antrenmanSolvedResult = await safeQuery(
      supabase
        .from('user_quiz_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('chunk_id', chunkId),
      `${FUNC} antrenman solved count error`,
      { userId, chunkId }
    );

    if (!antrenmanSolvedResult.success) {
      throwQueryError(FUNC, antrenmanSolvedResult.error);
    }

    const antrenmanPoolResult = await safeQuery(
      supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('chunk_id', chunkId)
        .eq('usage_type', 'antrenman'),
      `${FUNC} antrenman pool count error`,
      { chunkId }
    );

    if (!antrenmanPoolResult.success) {
      throwQueryError(FUNC, antrenmanPoolResult.error);
    }

    const denemePoolResult = await safeQuery(
      supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('chunk_id', chunkId)
        .eq('usage_type', 'deneme'),
      `${FUNC} deneme pool count error`,
      { chunkId }
    );

    if (!denemePoolResult.success) {
      throwQueryError(FUNC, denemePoolResult.error);
    }

    antrenmanSolved = antrenmanSolvedResult.count || 0;
    antrenmanPool = antrenmanPoolResult.count || 0;
    denemePool = denemePoolResult.count || 0;
  }

  return {
    completed: antrenmanSolved >= antrenmanQuota,
    antrenman: {
      solved: antrenmanSolved,
      total: antrenmanQuota,
      quota: antrenmanQuota,
      existing: antrenmanPool,
    },
    deneme: {
      solved: 0,
      total: denemeQuota,
      quota: denemeQuota,
      existing: denemePool,
    },
    mistakes: {
      solved: 0,
      total: 0,
      existing: 0,
    },
    aiLogic: aiLogic as Record<string, unknown>,
    concepts,
  };
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
  const quota = await calculateTopicQuota(userId, chunkId);

  let status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'COMPLETED';
  if (quota.used === 0) status = 'PENDING';
  else if (quota.used < quota.total) status = 'PROCESSING';

  return {
    used: quota.used,
    quota: { total: quota.total },
    isFull: quota.used >= quota.total,
    status,
    conceptCount: quota.conceptCount,
  };
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

  const result = await safeQuery<{ current_session: number }>(
    supabase
      .from('course_session_counters')
      .select('current_session')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle(),
    `${FUNC} error`,
    { userId, courseId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  const currentSession = result.data?.current_session || 1;

  return {
    currentSession,
    totalSessions: currentSession,
    courseId,
  };
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
  return {
    reviewQuota: 10,
  };
}
