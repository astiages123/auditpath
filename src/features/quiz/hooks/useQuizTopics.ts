import { useCallback, useEffect, useState } from 'react';
import {
  getCourseProgress,
  getCourseTopicsWithCounts,
} from '@/features/quiz/services/quizStatusService';
import { TopicWithCounts } from '@/features/courses/types/courseTypes';
import { logger } from '@/utils/logger';

interface UseQuizTopicsProps {
  isOpen: boolean;
  courseId: string;
  userId?: string;
}

export function useQuizTopics({
  isOpen,
  courseId,
  userId,
}: UseQuizTopicsProps) {
  const [topics, setTopics] = useState<TopicWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<{
    total: number;
    solved: number;
    percentage: number;
  } | null>(null);

  const loadTopics = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await getCourseTopicsWithCounts(courseId);
      setTopics(data);
      if (userId) {
        const progress = await getCourseProgress(userId, courseId);
        setCourseProgress(progress);
      }
    } catch (error) {
      logger.error('Error loading topics', error as Error);
    } finally {
      setLoading(false);
    }
  }, [courseId, userId]);

  useEffect(() => {
    if (isOpen) {
      loadTopics();
    }
  }, [isOpen, loadTopics]);

  return {
    topics,
    loading,
    courseProgress,
    refreshTopics: loadTopics,
  };
}
