import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { safeQuery } from '@/lib/supabaseHelpers';
import { getCourseName, getCourseStatsAggregate } from './quizCourseService';
import {
  getMasteredQuestionsCount,
  getTotalQuestionsInCourse,
} from './quizReadService';
import type { LandingCourseStats } from '../types/types';

const MODULE = 'QuizLandingService';

type LandingStatsRow = {
  course_id: string;
  mastery_score: number;
  updated_at: string | null;
};

type ActivityRow = {
  mastery_score: number;
  updated_at: string | null;
  chunk: { section_title: string } | null;
};

type CourseSummaryRow = {
  id: string;
  name: string;
  course_slug: string;
  total_hours: number | null;
  note_chunks: { count: number }[];
  questions: { count: number }[];
};

export interface ActivityItem {
  /** Bölüm başlığı */
  title: string;
  /** Ustalık skoru (0-100) */
  score: number;
  /** Güncellenme tarihi */
  date: string;
}

export interface QuizLandingDashboardData {
  /** Kurs adı */
  courseName: string;
  /** Toplam soru sayısı */
  totalQuestions: number;
  /** Çözülen toplam soru sayısı */
  totalSolved: number;
  /** Ustalaşılan soru sayısı */
  masteredCount: number;
  /** Toplam ustalık skoru (ortalama) */
  masteryScore: number;
  /** Son aktiviteler */
  recentActivity: ActivityItem[];
}

export interface CourseQuizSummary {
  /** Kurs ID'si */
  id: string;
  /** Başlık */
  title: string;
  /** URL slug */
  slug: string;
  /** Toplam süre metni */
  duration: string;
  /** Bölüm sayısı */
  topicCount: number;
  /** Soru sayısı */
  questionCount: number;
  /** Görsel URL'i */
  image: string;
}

function throwQueryError(func: string, error: string | undefined): never {
  const errorObject = new Error(error || `${func} failed`);
  logger.error(MODULE, func, 'Hata:', errorObject);
  throw errorObject;
}

/**
 * Kurs bazlı kütüphane istatistiklerini (tüm kurslar için) getirir.
 *
 * @param userId - Kullanıcı ID'si
 * @returns Kurs ID'si bazlı istatistik nesnesi
 */
export async function getLandingLibraryStats(
  userId: string
): Promise<Record<string, LandingCourseStats>> {
  const FUNC = 'getLandingLibraryStats';

  const result = await safeQuery<LandingStatsRow[]>(
    supabase
      .from('chunk_mastery')
      .select('course_id, mastery_score, updated_at')
      .eq('user_id', userId),
    `${FUNC} error`,
    { userId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  if (!result.data) return {};

  const libraryStats: Record<
    string,
    LandingCourseStats & { masteryScores?: number[] }
  > = {};

  result.data.forEach((row) => {
    const courseId = row.course_id;
    if (!libraryStats[courseId]) {
      libraryStats[courseId] = {
        averageMastery: 0,
        lastStudyDate: null,
        difficultSubject: null,
        totalSolved: 0,
        masteryScores: [],
      };
    }

    const courseStats = libraryStats[courseId];
    courseStats.masteryScores?.push(row.mastery_score);
    courseStats.totalSolved = (courseStats.totalSolved || 0) + 1;

    if (
      row.updated_at &&
      (!courseStats.lastStudyDate ||
        new Date(row.updated_at) > new Date(courseStats.lastStudyDate))
    ) {
      courseStats.lastStudyDate = row.updated_at;
    }
  });

  Object.keys(libraryStats).forEach((courseId) => {
    const courseStats = libraryStats[courseId];
    if (courseStats.masteryScores && courseStats.masteryScores.length > 0) {
      courseStats.averageMastery = Math.round(
        courseStats.masteryScores.reduce((sum, score) => sum + score, 0) /
          courseStats.masteryScores.length
      );
    }
    delete courseStats.masteryScores;
  });

  return libraryStats;
}

/**
 * Quiz ana sayfası (landing dashboard) için gerekli tüm özet verileri paralel olarak çeker.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @returns Dashboard verileri veya null
 */
export async function getLandingDashboardData(
  userId: string,
  courseId: string
): Promise<QuizLandingDashboardData | null> {
  const [stats, total, mastered, items, courseName] = await Promise.all([
    getCourseStatsAggregate(userId, courseId),
    getTotalQuestionsInCourse(courseId),
    getMasteredQuestionsCount(userId, courseId),
    getRecentChunkActivity(userId, courseId, 3),
    getCourseName(courseId),
  ]);

  const aggregateMastery =
    stats && stats.length > 0
      ? Math.round(
          stats.reduce<number>(
            (accumulator, currentItem) =>
              accumulator + (currentItem.mastery_score || 0),
            0
          ) / stats.length
        )
      : 0;

  return {
    courseName: courseName || 'Hukuk',
    totalQuestions: total,
    totalSolved:
      stats?.reduce<number>(
        (accumulator, currentItem) =>
          accumulator + (currentItem.total_questions_seen || 0),
        0
      ) || 0,
    masteredCount: mastered,
    masteryScore: aggregateMastery,
    recentActivity: items,
  };
}

/**
 * Kursa ait son ünite (chunk) aktivitelerini (mastery değişimleri) getirir.
 *
 * @param userId - Kullanıcı ID'si
 * @param courseId - Kurs ID'si
 * @param limit - Getirilecek aktivite sayısı
 * @returns Aktivite listesi
 */
export async function getRecentChunkActivity(
  userId: string,
  courseId: string,
  limit: number = 3
): Promise<ActivityItem[]> {
  const FUNC = 'getRecentChunkActivity';

  const result = await safeQuery<ActivityRow[]>(
    supabase
      .from('chunk_mastery')
      .select('mastery_score, updated_at, chunk:note_chunks(section_title)')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .order('updated_at', { ascending: false })
      .limit(limit),
    `${FUNC} error`,
    { userId, courseId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return (
    result.data?.map((item) => ({
      title: item.chunk?.section_title || 'İsimsiz Bölüm',
      score: item.mastery_score,
      date: item.updated_at || new Date().toISOString(),
    })) || []
  );
}

/**
 * Quiz kartı için kurs özet verilerini getirir.
 * Kurs adı, süresi, ünite ve soru sayılarını içerir.
 *
 * @param courseId - Kurs ID'si
 * @returns Kurs özeti veya null
 */
export async function getCourseQuizSummary(
  courseId: string
): Promise<CourseQuizSummary | null> {
  const FUNC = 'getCourseQuizSummary';

  const result = await safeQuery<CourseSummaryRow>(
    supabase
      .from('courses')
      .select(
        'id, name, course_slug, total_hours, note_chunks(count), questions(count)'
      )
      .eq('id', courseId)
      .single(),
    `${FUNC} error`,
    { courseId }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  if (!result.data) return null;

  return {
    id: result.data.id,
    title: result.data.name,
    slug: result.data.course_slug,
    duration: `${result.data.total_hours || 0} Saat`,
    topicCount: result.data.note_chunks?.[0]?.count || 0,
    questionCount: result.data.questions?.[0]?.count || 0,
    image: `/notes/${result.data.course_slug}/cover.webp`,
  };
}
