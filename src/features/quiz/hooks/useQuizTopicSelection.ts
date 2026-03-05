import { useCallback, useEffect, useState } from 'react';
import {
  TopicCompletionStats,
  TopicWithCounts,
} from '@/features/courses/types/courseTypes';
import { getTopicCompletionStatus } from '@/features/quiz/services/quizStatusService';
import { getFirstChunkIdForTopic } from '@/features/quiz/services/quizChunkService';
import { logger } from '@/utils/logger';
import { useQuizPersistence } from './useQuizPersistence';

interface UseQuizTopicSelectionOptions {
  courseId: string;
  userId?: string;
}

export function useQuizTopicSelection({
  courseId,
  userId,
}: UseQuizTopicSelectionOptions) {
  const { loadManager } = useQuizPersistence(courseId);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithCounts | null>(
    () => loadManager()?.selectedTopic || null
  );
  const [chunkId, setChunkId] = useState<string | null>(null);
  const [completionStatus, setCompletionStatus] =
    useState<TopicCompletionStats | null>(null);

  const refreshSelectedTopicData = useCallback(async () => {
    if (!selectedTopic || !courseId || !userId) {
      setChunkId(null);
      setCompletionStatus(null);
      return;
    }

    try {
      const [chunkId, status] = await Promise.all([
        getFirstChunkIdForTopic(courseId, selectedTopic.name),
        getTopicCompletionStatus(userId, courseId, selectedTopic.name),
      ]);

      setChunkId(chunkId);
      setCompletionStatus(status);
    } catch (error) {
      console.error(
        '[useQuizTopicSelection][refreshSelectedTopicData] Hata:',
        error
      );
      logger.error(
        'QuizTopicSelection',
        'refreshSelectedTopicData',
        'Konu verileri yüklenemedi:',
        error as Error
      );
    }
  }, [selectedTopic, courseId, userId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void refreshSelectedTopicData();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [refreshSelectedTopicData]);

  return {
    selectedTopic,
    setSelectedTopic,
    chunkId,
    completionStatus,
    setCompletionStatus,
    refreshSelectedTopicData,
  };
}
