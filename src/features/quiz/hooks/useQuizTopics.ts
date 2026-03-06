import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCourseProgress,
  getCourseTopicsWithCounts,
} from '@/features/quiz/services/quizStatusService';
import { TopicWithCounts } from '@/features/courses/types/courseTypes';
import { logger } from '@/utils/logger';

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
  const [topics, setTopics] = useState<TopicWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<QuizProgress | null>(
    null
  );

  /** Konuları ve ilerleme durumunu sunucudan yükler */
  const loadTopics = useCallback(async () => {
    if (!courseId) {
      return;
    }

    setIsLoading(true);
    try {
      const data = await getCourseTopicsWithCounts(courseId);
      const mappedTopics: TopicWithCounts[] = data.map((topic) => ({
        name: topic.title,
        isCompleted: false,
        counts: {
          antrenman: topic.count,
          deneme: 0,
          total: topic.count,
        },
      }));
      setTopics(mappedTopics);

      if (userId) {
        const progress = await getCourseProgress(userId, courseId);
        setCourseProgress(progress);
      }
    } catch (error) {
      logger.error(
        'QuizTopics',
        'loadTopics',
        'Konular yüklenirken hata:',
        error as Error
      );
    } finally {
      setIsLoading(false);
    }
  }, [courseId, userId]);

  /** Drawer açıldığında verileri otomatik tazeler */
  useEffect(() => {
    if (isOpen) {
      loadTopics();
    }
  }, [isOpen, loadTopics]);

  return useMemo(
    () => ({
      topics,
      loading: isLoading,
      courseProgress,
      refreshTopics: loadTopics,
    }),
    [topics, isLoading, courseProgress, loadTopics]
  );
}
