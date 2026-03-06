import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useQuizTopics } from './useQuizTopics';
import { useQuizGeneration } from './useQuizGeneration';
import { useQuizPersistence } from './useQuizPersistence';
import {
  QUIZ_PHASE,
  type QuizPhase,
  type UseQuizManagerProps,
  type UseQuizManagerReturn,
} from './quizManagerTypes';
import { useQuizTopicSelection } from './useQuizTopicSelection';
import { useQuizExamSession } from './useQuizExamSession';

/**
 * Quiz yönetim sürecini koordine eden üst seviye hook.
 * Konu seçimi, üretim ve oturum akışı daha küçük alt hook'lara ayrılmıştır.
 */
export function useQuizManager({
  isOpen,
  courseId,
  courseName,
}: UseQuizManagerProps): UseQuizManagerReturn {
  const { user } = useAuth();
  const {
    topics,
    loading: topicsLoading,
    courseProgress,
    refreshTopics,
  } = useQuizTopics({
    isOpen,
    courseId,
    userId: user?.id,
  });

  const { generation, startGeneration, stopGeneration, resetGeneration } =
    useQuizGeneration();
  const { saveManager, loadManager } = useQuizPersistence(courseId);
  const {
    selectedTopic,
    setSelectedTopic,
    chunkId,
    completionStatus,
    setCompletionStatus,
    refreshSelectedTopicData,
  } = useQuizTopicSelection({
    courseId,
    userId: user?.id,
  });
  const [isQuizActive, setIsQuizActive] = useState<boolean>(() => {
    const persisted = loadManager();
    return persisted?.isQuizActive || false;
  });
  const {
    existingQuestions,
    handleStartQuiz: startExamSession,
    handleBackToTopics,
    handleFinishQuiz,
    handleStartSmartExam,
    resetState: resetExamSession,
  } = useQuizExamSession({
    courseId,
    courseName,
    userId: user?.id,
    selectedTopic,
    chunkId,
    completionStatus,
    setSelectedTopic,
    setCompletionStatus,
    setIsQuizActive,
    resetGeneration,
    refreshTopics,
  });

  const quizPhase: QuizPhase = (() => {
    if (isQuizActive) return QUIZ_PHASE.ACTIVE;
    if (generation.isGenerating) return QUIZ_PHASE.MAPPING;
    if (completionStatus?.aiLogic && completionStatus.concepts?.length) {
      return QUIZ_PHASE.BRIEFING;
    }
    return QUIZ_PHASE.NOT_ANALYZED;
  })();

  const handleGenerate = useCallback(async () => {
    if (!chunkId) return;

    try {
      await startGeneration(
        chunkId,
        async () => {
          if (selectedTopic && user) {
            await refreshSelectedTopicData();
          }
        },
        user?.id
      );
    } catch {
      // Üretim hataları alt hook içinde ele alınıyor; burada fazladan işlem yapılmıyor.
    }
  }, [chunkId, startGeneration, selectedTopic, user, refreshSelectedTopicData]);

  const handleStopGeneration = useCallback(() => {
    stopGeneration();
  }, [stopGeneration]);

  const handleStartQuiz = useCallback(() => {
    startExamSession(() => {
      void handleGenerate();
    });
  }, [startExamSession, handleGenerate]);

  const resetState = useCallback(() => {
    resetExamSession();
  }, [resetExamSession]);

  useEffect(() => {
    if (selectedTopic) {
      saveManager(selectedTopic, quizPhase, isQuizActive);
    }
  }, [selectedTopic, quizPhase, isQuizActive, saveManager]);

  return useMemo(
    () => ({
      user,
      topics,
      selectedTopic,
      setSelectedTopic,
      chunkId,
      loading: topicsLoading,
      completionStatus,
      existingQuestions,
      isQuizActive,
      isGeneratingExam: generation.isGenerating,
      quizPhase,
      examLogs: generation.logs,
      examProgress: generation.progress,
      courseProgress,
      handleStartQuiz,
      handleGenerate,
      handleStopGeneration,
      handleBackToTopics,
      handleFinishQuiz,
      handleStartSmartExam,
      resetState,
    }),
    [
      user,
      topics,
      selectedTopic,
      setSelectedTopic,
      chunkId,
      topicsLoading,
      completionStatus,
      existingQuestions,
      isQuizActive,
      generation.isGenerating,
      generation.logs,
      generation.progress,
      quizPhase,
      courseProgress,
      handleStartQuiz,
      handleGenerate,
      handleStopGeneration,
      handleBackToTopics,
      handleFinishQuiz,
      handleStartSmartExam,
      resetState,
    ]
  );
}

export { QUIZ_PHASE };
export type { QuizPhase, UseQuizManagerProps, UseQuizManagerReturn };
