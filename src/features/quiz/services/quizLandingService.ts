import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { safeQuery } from '@/lib/supabaseHelpers';
import { getCourseName, getCourseStatsAggregate } from './quizCoreService';
import {
  getMasteredQuestionsCount,
  getTotalQuestionsInCourse,
} from './quizQuestionService';
import type { LandingCourseStats } from '../types/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE = 'QuizLandingService';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// LANDING SERVICES
// ============================================================================

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
  try {
    // Tüm kursların metriklerini getir (chunk_mastery üzerinden)
    const { data: stats } = await safeQuery<
      { course_id: string; mastery_score: number; updated_at: string | null }[]
    >(
      supabase
        .from('chunk_mastery')
        .select('course_id, mastery_score, updated_at')
        .eq('user_id', userId),
      `${FUNC} error`,
      { userId }
    );

    if (!stats) return {};

    const libraryStats: Record<
      string,
      LandingCourseStats & { masteryScores?: number[] }
    > = {};

    // Kurs bazlı grupla ve özetle
    stats.forEach((row) => {
      const cid = row.course_id;
      if (!libraryStats[cid]) {
        libraryStats[cid] = {
          averageMastery: 0,
          lastStudyDate: null,
          difficultSubject: null,
          totalSolved: 0,
          masteryScores: [],
        };
      }

      const cs = libraryStats[cid];
      cs.masteryScores?.push(row.mastery_score);
      cs.totalSolved = (cs.totalSolved || 0) + 1;

      if (row.updated_at) {
        if (
          !cs.lastStudyDate ||
          new Date(row.updated_at) > new Date(cs.lastStudyDate)
        ) {
          cs.lastStudyDate = row.updated_at;
        }
      }
    });

    // Ortalama hesapla
    Object.keys(libraryStats).forEach((cid) => {
      const cs = libraryStats[cid];
      if (cs.masteryScores && cs.masteryScores.length > 0) {
        cs.averageMastery = Math.round(
          cs.masteryScores.reduce((a, b) => a + b, 0) / cs.masteryScores.length
        );
      }
      delete cs.masteryScores;
    });

    return libraryStats;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return {};
  }
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
  const FUNC = 'getLandingDashboardData';
  try {
    const [stats, total, mastered, items, courseName] = await Promise.all([
      getCourseStatsAggregate(userId, courseId),
      getTotalQuestionsInCourse(courseId),
      getMasteredQuestionsCount(userId, courseId),
      getRecentChunkActivity(userId, courseId, 3),
      getCourseName(courseId),
    ]);

    // Aggregate Mastery: Chunk bazlı skorların ortalaması
    const aggregateMastery =
      stats && stats.length > 0
        ? Math.round(
            stats.reduce<number>(
              (acc, curr) => acc + (curr.mastery_score || 0),
              0
            ) / stats.length
          )
        : 0;

    return {
      courseName: courseName || 'Hukuk',
      totalQuestions: total,
      totalSolved:
        stats?.reduce<number>(
          (acc, curr) => acc + (curr.total_questions_seen || 0),
          0
        ) || 0,
      masteredCount: mastered,
      masteryScore: aggregateMastery,
      recentActivity: items,
    };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
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
  try {
    interface ActivityRow {
      mastery_score: number;
      updated_at: string | null;
      chunk: { section_title: string } | null;
    }

    const { data } = await safeQuery<ActivityRow[]>(
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

    return (
      data?.map((item) => ({
        title: item.chunk?.section_title || 'İsimsiz Bölüm',
        score: item.mastery_score,
        date: item.updated_at || new Date().toISOString(),
      })) || []
    );
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return [];
  }
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
  try {
    interface CourseSummaryRow {
      id: string;
      name: string;
      course_slug: string;
      total_hours: number | null;
      note_chunks: { count: number }[];
      questions: { count: number }[];
    }

    const { data: course } = await safeQuery<CourseSummaryRow>(
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

    if (!course) return null;

    return {
      id: course.id,
      title: course.name,
      slug: course.course_slug,
      duration: `${course.total_hours || 0} Saat`,
      topicCount: course.note_chunks?.[0]?.count || 0,
      questionCount: course.questions?.[0]?.count || 0,
      image: `/notes/${course.course_slug}/cover.webp`,
    };
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}
