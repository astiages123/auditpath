import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import { logger } from '@/utils/logger';
import {
  type BloomStats,
  type QuizResults,
  type SRSStats,
} from '@/features/quiz/types';

const MODULE = 'QuizAnalyticsService';

type QuizProgressAnalyticsRow = {
  response_type: string | null;
  time_spent_ms?: number | null;
  questions?: {
    bloom_level: string | null;
  } | null;
};

type TopicProficiencyRow = {
  mastery_score: number;
  chunk: {
    section_title: string;
    ai_logic: unknown;
  } | null;
};

type QuestionStatusRow = {
  status: string | null;
};

function throwQueryError(func: string, error: string | undefined): never {
  const errorObject = new Error(error || `${func} failed`);
  logger.error(MODULE, func, 'Hata:', errorObject);
  throw errorObject;
}

/**
 * Kullanıcının kurstaki genel quiz istatistiklerini hesaplar.
 * Doğru, yanlış, boş sayılarını ve toplam geçen süreyi döndürür.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns Quiz istatistikleri (QuizResults)
 */
export async function getQuizAggregateStats(
  userId: string,
  courseId: string
): Promise<QuizResults> {
  const FUNC = 'getQuizAggregateStats';

  const result = await safeQuery<QuizProgressAnalyticsRow[]>(
    supabase
      .from('user_quiz_progress')
      .select('response_type, time_spent_ms')
      .eq('user_id', userId)
      .eq('course_id', courseId),
    `${FUNC} error`,
    { userId, courseId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  const stats: QuizResults = {
    correct: 0,
    incorrect: 0,
    blank: 0,
    totalTimeMs: 0,
  };

  result.data?.forEach((row) => {
    if (row.response_type === 'correct') stats.correct++;
    else if (row.response_type === 'incorrect') stats.incorrect++;
    else stats.blank++;

    stats.totalTimeMs += row.time_spent_ms || 0;
  });

  return stats;
}

/**
 * Konu (topic) bazlı yetkinlik skorlarını getirir.
 * Her bir konu için başarı yüzdesini ve öne çıkan Bloom seviyesini hesaplar.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns Konu bazlı skor listesi
 */
export async function getTopicProficiencyScores(
  userId: string,
  courseId: string
): Promise<{ section_title: string; bloom_level: string; score: number }[]> {
  const FUNC = 'getTopicProficiencyScores';

  const result = await safeQuery<TopicProficiencyRow[]>(
    supabase
      .from('chunk_mastery')
      .select(
        `
                  mastery_score,
                  chunk:note_chunks(section_title, ai_logic)
              `
      )
      .eq('user_id', userId)
      .eq('course_id', courseId),
    `${FUNC} error`,
    { userId, courseId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  const scores: {
    section_title: string;
    bloom_level: string;
    score: number;
  }[] = [];

  result.data?.forEach((row) => {
    if (!row.chunk) return;

    const aiLogic =
      (row.chunk.ai_logic as { primary_bloom_level?: string }) || {};
    const bloom = aiLogic.primary_bloom_level || 'knowledge';

    const bloomMap: Record<string, string> = {
      knowledge: 'Bilgi',
      application: 'Uygulama',
      analysis: 'Analiz',
    };

    scores.push({
      section_title: row.chunk.section_title,
      bloom_level: bloomMap[bloom] || 'Bilgi',
      score: row.mastery_score,
    });
  });

  return scores;
}

/**
 * Aralıklı tekrar (SRS) istatistiklerini getirir.
 * Aktif, incelenen ve ustalaşılan soru sayılarını hesaplar.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns SRS İstatistikleri (SRSStats)
 */
export async function getSRSStats(
  userId: string,
  courseId: string
): Promise<SRSStats> {
  const FUNC = 'getSRSStats';

  const result = await safeQuery<QuestionStatusRow[]>(
    supabase
      .from('user_question_status')
      .select('status, questions!inner(course_id)')
      .eq('user_id', userId)
      .eq('questions.course_id', courseId),
    `${FUNC} error`,
    { userId, courseId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  const stats: SRSStats = {
    active: 0,
    reviewing: 0,
    mastered: 0,
    totalCards: result.data?.length || 0,
    dueCards: 0,
    reviewCards: 0,
    retentionRate: 0,
  };

  result.data?.forEach((row) => {
    if (row.status === 'active') stats.active++;
    else if (row.status === 'reviewing') stats.reviewing++;
    else if (row.status === 'mastered') stats.mastered++;
  });

  return stats;
}

/**
 * Kurs için temel çözüm istatistiklerini getirir.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns Çözülen toplam soru sayısı objesi veya null
 */
export async function getCourseStats(
  userId: string,
  courseId: string
): Promise<{ totalQuestionsSolved: number } | null> {
  const FUNC = 'getCourseStats';

  const result = await safeQuery(
    supabase
      .from('user_quiz_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('course_id', courseId),
    `${FUNC} error`,
    { userId, courseId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return {
    totalQuestionsSolved: result.count || 0,
  };
}

/**
 * Kullanıcının Bloom taksonomisi seviyelerine göre istatistiklerini getirir.
 * Her seviye için toplam soru, doğru sayısı ve başarı skorunu hesaplar.
 *
 * @param userId - Kullanıcı ID'si
 * @returns Bloom istatistikleri listesi (BloomStats[])
 */
export async function getBloomStats(userId: string): Promise<BloomStats[]> {
  const FUNC = 'getBloomStats';

  const result = await safeQuery<QuizProgressAnalyticsRow[]>(
    supabase
      .from('user_quiz_progress')
      .select(
        `
          response_type,
          questions!inner(bloom_level)
        `
      )
      .eq('user_id', userId),
    `${FUNC} error`,
    { userId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  const bloomMap: Record<
    string,
    { correct: number; total: number; score: number }
  > = {
    knowledge: { correct: 0, total: 0, score: 0 },
    application: { correct: 0, total: 0, score: 0 },
    analysis: { correct: 0, total: 0, score: 0 },
  };

  result.data?.forEach((row) => {
    const level = row.questions?.bloom_level || 'knowledge';
    if (!bloomMap[level]) {
      bloomMap[level] = { correct: 0, total: 0, score: 0 };
    }

    bloomMap[level].total++;
    if (row.response_type === 'correct') {
      bloomMap[level].correct++;
    }
  });

  const displayMap: Record<string, string> = {
    knowledge: 'Bilgi',
    application: 'Uygula',
    analysis: 'Analiz',
  };

  return Object.entries(bloomMap).map(([level, stats]) => ({
    level: displayMap[level] || level,
    correct: stats.correct,
    questionsSolved: stats.total,
    score:
      stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
  }));
}
