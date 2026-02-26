import { useCallback, useEffect, useState } from 'react';
import { useQuizTopics } from './useQuizTopics';
import { useQuizGeneration } from './useQuizGeneration';
import { getTopicCompletionStatus } from '@/features/quiz/services/quizStatusService';
import { getFirstChunkIdForTopic } from '@/features/quiz/services/quizService';
import * as QuizService from '@/features/quiz/services/quizService';
import { generateForChunk } from '@/features/quiz/logic/quizParser';
import {
  type GenerationLog,
  type QuizQuestion,
  QuizQuestionSchema,
} from '@/features/quiz/types';
import {
  TopicCompletionStats,
  TopicWithCounts,
} from '@/features/courses/types/courseTypes';
import { logger } from '@/utils/logger';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { parseOrThrow } from '@/utils/validation';

export const QUIZ_PHASE = {
  NOT_ANALYZED: 'NOT_ANALYZED',
  MAPPING: 'MAPPING',
  BRIEFING: 'BRIEFING',
  ACTIVE: 'ACTIVE',
} as const;

export type QuizPhase = (typeof QUIZ_PHASE)[keyof typeof QUIZ_PHASE];

export interface GenerationState {
  isGenerating: boolean;
  logs: GenerationLog[];
  progress: { current: number; total: number };
}

interface UseQuizManagerProps {
  isOpen: boolean;
  courseId: string;
  courseName: string;
}

export interface UseQuizManagerReturn {
  user: ReturnType<typeof useAuth>['user'];
  topics: TopicWithCounts[];
  selectedTopic: TopicWithCounts | null;
  setSelectedTopic: (topic: TopicWithCounts | null) => void;
  targetChunkId: string | null;
  loading: boolean;
  completionStatus: TopicCompletionStats | null;
  existingQuestions: QuizQuestion[];
  isQuizActive: boolean;
  isGeneratingExam: boolean;
  quizPhase: QuizPhase;
  examLogs: GenerationLog[];
  examProgress: GenerationState['progress'];
  courseProgress: { total: number; solved: number; percentage: number } | null;
  handleStartQuiz: () => void;
  handleGenerate: (mappingOnly?: boolean) => Promise<void>;
  handleBackToTopics: () => void;
  handleFinishQuiz: () => Promise<void>;
  handleStartSmartExam: () => Promise<void>;
  resetState: () => void;
}

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

  const {
    generation,
    startGeneration,
    resetGeneration,
    createGenerationCallbacks,
  } = useQuizGeneration();

  const [selectedTopic, setSelectedTopic] = useState<TopicWithCounts | null>(
    null
  );
  const [targetChunkId, setTargetChunkId] = useState<string | null>(null);
  const [completionStatus, setCompletionStatus] =
    useState<TopicCompletionStats | null>(null);
  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>(
    []
  );
  const [isQuizActive, setIsQuizActive] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadTopicData() {
      if (!selectedTopic || !courseId || !user) {
        setTargetChunkId(null);
        setCompletionStatus(null);
        return;
      }
      try {
        const chunkRes = await getFirstChunkIdForTopic(
          courseId,
          selectedTopic.name
        );
        const status = await getTopicCompletionStatus(
          user.id,
          courseId,
          selectedTopic.name
        );
        if (mounted) {
          setTargetChunkId(chunkRes);
          setCompletionStatus(status);
        }
      } catch (error) {
        if (mounted) {
          logger.error('Error loading topic data', error as Error);
        }
      }
    }

    loadTopicData();

    return () => {
      mounted = false;
    };
  }, [selectedTopic, courseId, user]);

  const quizPhase = (() => {
    if (isQuizActive) return QUIZ_PHASE.ACTIVE;
    if (generation.isGenerating) return QUIZ_PHASE.MAPPING;
    if (completionStatus?.aiLogic && completionStatus?.concepts?.length) {
      return QUIZ_PHASE.BRIEFING;
    }
    return QUIZ_PHASE.NOT_ANALYZED;
  })();

  const handleGenerate = useCallback(
    async (_mappingOnly = true) => {
      if (!targetChunkId) return;
      await startGeneration(
        targetChunkId,
        async () => {
          if (selectedTopic && user) {
            const newStatus = await getTopicCompletionStatus(
              user.id,
              courseId,
              selectedTopic.name
            );
            setCompletionStatus(newStatus);
          }
        },
        user?.id
      );
    },
    [targetChunkId, user, selectedTopic, courseId, startGeneration]
  );

  const startExamFromPool = useCallback(
    async (userId: string, courseId: string) => {
      try {
        const poolResult = await QuizService.fetchGeneratedQuestions(
          courseId,
          'deneme',
          20
        );
        if (poolResult && poolResult.length >= 20) {
          return poolResult.map((q) => ({
            ...parseOrThrow(QuizQuestionSchema, q.question_data),
            id: q.id,
          })) as QuizQuestion[];
        }
      } catch (error) {
        logger.error('Error fetching exam from pool', error as Error);
      }
      return null;
    },
    []
  );

  const generateAndFetchExam = useCallback(async () => {
    if (!user) return null;
    try {
      const result = await QuizService.generateSmartExam(
        courseId,
        user.id,
        createGenerationCallbacks()
      );
      if (result.success && result.questionIds.length > 0) {
        const questionsData = await QuizService.fetchQuestionsByIds(
          result.questionIds
        );
        if (questionsData) {
          return questionsData.map((q) => ({
            ...parseOrThrow(QuizQuestionSchema, q.question_data),
            id: q.id,
          })) as QuizQuestion[];
        }
      }
    } catch (error) {
      logger.error('Failed to generate smart exam:', error as Error);
    }
    return null;
  }, [user, courseId, createGenerationCallbacks]);

  const handleStartQuiz = useCallback(() => {
    if (
      completionStatus &&
      completionStatus.antrenman.existing < completionStatus.antrenman.quota
    ) {
      handleGenerate(false);
      return;
    }
    setExistingQuestions([]);
    setIsQuizActive(true);
  }, [completionStatus, handleGenerate]);

  const handleBackToTopics = useCallback(() => {
    setSelectedTopic(null);
    setIsQuizActive(false);
    resetGeneration();
    setExistingQuestions([]);
    refreshTopics();
  }, [resetGeneration, refreshTopics]);

  const handleFinishQuiz = useCallback(async () => {
    setIsQuizActive(false);
    setExistingQuestions([]);

    if (selectedTopic && user && courseId) {
      const status = await getTopicCompletionStatus(
        user.id,
        courseId,
        selectedTopic.name
      );
      setCompletionStatus(status);

      if (targetChunkId) {
        const needsDeneme = status.deneme.existing < status.deneme.quota;

        if (needsDeneme) {
          logger.info('Triggering background generation for Deneme', {
            topic: selectedTopic.name,
          });

          generateForChunk(
            targetChunkId,
            {
              onLog: () => {},
              onTotalTargetCalculated: () => {},
              onQuestionSaved: () => {},
              onComplete: async () => {
                const finalStatus = await getTopicCompletionStatus(
                  user.id,
                  courseId,
                  selectedTopic.name
                );
                setCompletionStatus(finalStatus);
              },
              onError: (err) => {
                logger.error('Background generation error:', { message: err });
              },
            },
            { usageType: 'deneme', userId: user.id }
          );
        }
      }
    }
  }, [selectedTopic, user, courseId, targetChunkId]);

  const handleStartSmartExam = useCallback(async () => {
    if (!user || !courseId || !courseName) return;
    const pooledQuestions = await startExamFromPool(user.id, courseId);
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
  }, [user, courseId, courseName, startExamFromPool, generateAndFetchExam]);

  const resetState = useCallback(() => {
    setSelectedTopic(null);
    setIsQuizActive(false);
    setExistingQuestions([]);
  }, []);

  return {
    user,
    topics,
    selectedTopic,
    setSelectedTopic,
    targetChunkId,
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
    handleBackToTopics,
    handleFinishQuiz,
    handleStartSmartExam,
    resetState,
  };
}
