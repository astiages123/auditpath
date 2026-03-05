import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCourseProgress,
  getCourseTopicsWithCounts,
} from '@/features/quiz/services/quizStatusService';
import { TopicWithCounts } from '@/features/courses/types/courseTypes';
import { logger } from '@/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface UseQuizTopicsProps {
  /** Modül/Drawer açık mı? */
  isOpen: boolean;
  /** Ders ID'si */
  courseId: string;
  /** Kullanıcı ID'si (opsiyonel) */
  userId?: string;
}

export interface QuizProgress {
  /** Toplam soru sayısı */
  total: number;
  /** Çözülen soru sayısı */
  solved: number;
  /** Başarı/İlerleme yüzdesi */
  percentage: number;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Quiz modülü için konu listesini ve ders ilerlemesini yöneten hook.
 * Ünite bazlı soru sayılarını ve kullanıcının genel çözüm istatistiklerini getirir.
 *
 * @param {UseQuizTopicsProps} props - Hook parametreleri
 * @returns {Object} { topics, loading, courseProgress, refreshTopics }
 */
export function useQuizTopics({
  isOpen,
  courseId,
  userId,
}: UseQuizTopicsProps) {
  // === STATE ===

  const [topics, setTopics] = useState<TopicWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<QuizProgress | null>(
    null
  );

  // === HANDLERS ===

  /** Konuları ve ilerleme durumunu sunucudan yükler */
  const loadTopics = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await getCourseTopicsWithCounts(courseId);
      // Map CourseTopicCount[] to TopicWithCounts[]
      const mappedTopics: TopicWithCounts[] = data.map((t) => ({
        name: t.title,
        isCompleted: false, // Default value, will be updated by progress if needed
        counts: {
          antrenman: t.count,
          deneme: 0, // Not provided by getCourseTopicsWithCounts
          total: t.count,
        },
      }));
      setTopics(mappedTopics);

      if (userId) {
        const progress = await getCourseProgress(userId, courseId);
        setCourseProgress(progress);
      }
    } catch (error) {
      console.error('[useQuizTopics][loadTopics] Hata:', error);
      logger.error(
        'QuizTopics',
        'loadTopics',
        'Konular yüklenirken hata:',
        error as Error
      );
    } finally {
      setLoading(false);
    }
  }, [courseId, userId]);

  // === EFFECTS ===

  /** Drawer açıldığında verileri otomatik tazeler */
  useEffect(() => {
    if (isOpen) {
      loadTopics();
    }
  }, [isOpen, loadTopics]);

  // === RETURN ===
  return useMemo(
    () => ({
      topics,
      loading,
      courseProgress,
      refreshTopics: loadTopics,
    }),
    [topics, loading, courseProgress, loadTopics]
  );
}
