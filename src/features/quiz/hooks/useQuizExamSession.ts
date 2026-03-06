import { useCallback, useState } from 'react';
import { type QuizQuestion, QuizQuestionSchema } from '@/features/quiz/types';
import {
  TopicCompletionStats,
  TopicWithCounts,
} from '@/features/courses/types/courseTypes';
import { parseOrThrow } from '@/utils/validation';
import { logger } from '@/utils/logger';
import {
  fetchGeneratedQuestionsByCourse,
  fetchQuestionsByIds,
  generateSmartExam,
} from '@/features/quiz/services/quizQuestionService';
import { generateForChunk } from '@/features/quiz/logic/quizParser';
import { getTopicCompletionStatus } from '@/features/quiz/services/quizStatusService';

interface UseQuizExamSessionOptions {
  courseId: string;
  courseName: string;
  userId?: string;
  selectedTopic: TopicWithCounts | null;
  chunkId: string | null;
  completionStatus: TopicCompletionStats | null;
  setSelectedTopic: (topic: TopicWithCounts | null) => void;
  setCompletionStatus: (status: TopicCompletionStats | null) => void;
  setIsQuizActive: (active: boolean) => void;
  resetGeneration: () => void;
  refreshTopics: () => void;
}

const normalizeStoredQuestion = (questionRow: {
  id: string;
  question_data: unknown;
}) =>
  ({
    ...(parseOrThrow(QuizQuestionSchema, questionRow.question_data) as object),
    id: questionRow.id,
  }) as QuizQuestion;

export function useQuizExamSession({
  courseId,
  courseName,
  userId,
  selectedTopic,
  chunkId,
  completionStatus,
  setSelectedTopic,
  setCompletionStatus,
  setIsQuizActive,
  resetGeneration,
  refreshTopics,
}: UseQuizExamSessionOptions) {
  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>(
    []
  );

  const startExamFromPool = useCallback(async () => {
    try {
      const poolResult = await fetchGeneratedQuestionsByCourse(
        courseId,
        'deneme',
        20
      );
      if (poolResult && poolResult.length >= 20) {
        return poolResult.map(normalizeStoredQuestion);
      }
    } catch (error) {
      logger.error(
        'QuizExamSession',
        'startExamFromPool',
        'Havuzdan sınav çekilemedi:',
        error as Error
      );
    }
    return null;
  }, [courseId]);

  const generateAndFetchExam = useCallback(async () => {
    if (!userId) return null;
    try {
      const result = await generateSmartExam(courseId, userId);
      if (result.success && result.questionIds.length > 0) {
        const questionsData = await fetchQuestionsByIds(result.questionIds);
        if (questionsData) {
          return questionsData.map(normalizeStoredQuestion);
        }
      }
    } catch (error) {
      logger.error(
        'QuizExamSession',
        'generateAndFetchExam',
        'Akıllı sınav üretilemedi:',
        error as Error
      );
    }
    return null;
  }, [userId, courseId]);

  const handleStartQuiz = useCallback(
    (onGenerate: () => void) => {
      if (
        completionStatus &&
        completionStatus.antrenman.existing < completionStatus.antrenman.quota
      ) {
        onGenerate();
        return;
      }

      setExistingQuestions([]);
      setIsQuizActive(true);
    },
    [completionStatus, setIsQuizActive]
  );

  const handleBackToTopics = useCallback(() => {
    setSelectedTopic(null);
    setIsQuizActive(false);
    resetGeneration();
    setExistingQuestions([]);
    refreshTopics();
  }, [setSelectedTopic, setIsQuizActive, resetGeneration, refreshTopics]);

  const handleFinishQuiz = useCallback(async () => {
    setIsQuizActive(false);
    setExistingQuestions([]);

    if (!selectedTopic || !userId || !courseId) return;

    try {
      const status = await getTopicCompletionStatus(
        userId,
        courseId,
        selectedTopic.name
      );
      setCompletionStatus(status);

      if (!chunkId || status.deneme.existing >= status.deneme.quota) {
        return;
      }

      logger.info(
        'QuizExamSession',
        'handleFinishQuiz',
        'Deneme soruları için arka plan üretimi tetikleniyor.',
        {
          topic: selectedTopic.name,
        }
      );

      generateForChunk(
        chunkId,
        {
          onLog: () => {},
          onTotalTargetCalculated: () => {},
          onQuestionSaved: () => {},
          onComplete: async () => {
            const finalStatus = await getTopicCompletionStatus(
              userId,
              courseId,
              selectedTopic.name
            );
            setCompletionStatus(finalStatus);
          },
          onError: (generationError) => {
            logger.error(
              'QuizExamSession',
              'handleFinishQuiz',
              'Arka plan üretim hatası:',
              { message: generationError }
            );
          },
        },
        { usageType: 'deneme', userId }
      );
    } catch (error) {
      logger.error(
        'QuizExamSession',
        'handleFinishQuiz',
        'Sınav sonrası durum güncellenemedi:',
        error as Error
      );
    }
  }, [
    selectedTopic,
    userId,
    courseId,
    chunkId,
    setCompletionStatus,
    setIsQuizActive,
  ]);

  const handleStartSmartExam = useCallback(async () => {
    if (!userId || !courseId || !courseName) return;
    try {
      const pooledQuestions = await startExamFromPool();
      if (pooledQuestions) {
        setExistingQuestions(pooledQuestions);
        setSelectedTopic({
          name: 'Karma Deneme Sınavı',
          isCompleted: false,
          counts: {
            antrenman: 0,
            deneme: pooledQuestions.length,
            total: pooledQuestions.length,
          },
        });
        setIsQuizActive(true);
        return;
      }

      const generatedQuestions = await generateAndFetchExam();
      if (generatedQuestions) {
        setExistingQuestions(generatedQuestions);
        setSelectedTopic({
          name: 'Karma Deneme Sınavı',
          isCompleted: false,
          counts: {
            antrenman: 0,
            deneme: generatedQuestions.length,
            total: generatedQuestions.length,
          },
        });
        setIsQuizActive(true);
      }
    } catch (error) {
      logger.error(
        'QuizExamSession',
        'handleStartSmartExam',
        'Karma deneme başlatılamadı:',
        error as Error
      );
    }
  }, [
    userId,
    courseId,
    courseName,
    startExamFromPool,
    generateAndFetchExam,
    setSelectedTopic,
    setIsQuizActive,
  ]);

  const resetState = useCallback(() => {
    setSelectedTopic(null);
    setIsQuizActive(false);
    setExistingQuestions([]);
  }, [setSelectedTopic, setIsQuizActive]);

  return {
    existingQuestions,
    handleStartQuiz,
    handleBackToTopics,
    handleFinishQuiz,
    handleStartSmartExam,
    resetState,
  };
}
