import { useCallback, useEffect, useState } from 'react';
import {
  getCourseProgress,
  getCourseTopicsWithCounts,
  getTopicCompletionStatus,
} from '@/features/quiz/services/quizStatusService';
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
import { MAX_LOG_ENTRIES } from '../utils/constants';

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

const INITIAL_GENERATION_STATE: GenerationState = {
  isGenerating: false,
  logs: [],
  progress: { current: 0, total: 0 },
};

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
  handleStartSmartExam: () => Promise<void>;
  resetState: () => void;
}

export function useQuizManager({
  isOpen,
  courseId,
  courseName,
}: UseQuizManagerProps): UseQuizManagerReturn {
  const { user } = useAuth();

  const [topics, setTopics] = useState<TopicWithCounts[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithCounts | null>(
    null
  );
  const [targetChunkId, setTargetChunkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionStatus, setCompletionStatus] =
    useState<TopicCompletionStats | null>(null);
  const [courseProgress, setCourseProgress] = useState<{
    total: number;
    solved: number;
    percentage: number;
  } | null>(null);
  const [generation, setGeneration] = useState<GenerationState>(
    INITIAL_GENERATION_STATE
  );
  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>(
    []
  );
  const [isQuizActive, setIsQuizActive] = useState(false);

  const loadTopics = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await getCourseTopicsWithCounts(courseId);
      setTopics(data);
      if (user) {
        const progress = await getCourseProgress(user.id, courseId);
        setCourseProgress(progress);
      }
    } catch (error) {
      logger.error('Error loading topics', error as Error);
    } finally {
      setLoading(false);
    }
  }, [courseId, user]);

  useEffect(() => {
    if (isOpen) loadTopics();
  }, [isOpen, loadTopics]);

  useEffect(() => {
    let mounted = true;
    if (!selectedTopic || !courseId || !user) {
      setTargetChunkId(null);
      setCompletionStatus(null);
      return;
    }
    async function loadTopicData() {
      if (!selectedTopic || !courseId || !user) return;
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
        logger.error('Error loading topic data', error as Error);
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
    if (completionStatus?.aiLogic && completionStatus?.concepts?.length)
      return QUIZ_PHASE.BRIEFING;
    return QUIZ_PHASE.NOT_ANALYZED;
  })();

  const createGenerationCallbacks = useCallback(
    (onCompleteExtra?: () => void | Promise<void>) => ({
      onLog: (log: GenerationLog) =>
        setGeneration((prev) => ({
          ...prev,
          logs: [log, ...prev.logs].slice(0, MAX_LOG_ENTRIES),
        })),
      onTotalTargetCalculated: (total: number) =>
        setGeneration((prev) => ({
          ...prev,
          progress: { ...prev.progress, total },
        })),
      onQuestionSaved: (count: number) =>
        setGeneration((prev) => ({
          ...prev,
          progress: { ...prev.progress, current: count },
        })),
      onComplete: async () => {
        if (onCompleteExtra) await onCompleteExtra();
        setGeneration((prev) => ({ ...prev, isGenerating: false }));
      },
      onError: (err: string) => {
        logger.error('Generation error:', { message: err });
        setGeneration((prev) => ({ ...prev, isGenerating: false }));
      },
    }),
    []
  );

  const handleGenerate = useCallback(
    async (_mappingOnly = true) => {
      if (!targetChunkId) return;
      const initialLogs: GenerationLog[] = [
        {
          id: 'ai-warning-' + Date.now(),
          message: 'İçerik analiz ediliyor...',
          step: 'INIT',
          details: {},
          timestamp: new Date(),
        },
      ];
      setGeneration({
        isGenerating: true,
        logs: initialLogs,
        progress: { current: 0, total: 0 },
      });
      try {
        await generateForChunk(
          targetChunkId,
          createGenerationCallbacks(async () => {
            if (selectedTopic && user) {
              const newStatus = await getTopicCompletionStatus(
                user.id,
                courseId,
                selectedTopic.name
              );
              setCompletionStatus(newStatus);
            }
          }),
          { userId: user?.id }
        );
      } catch (error) {
        logger.error('Failed to generate:', error as Error);
        setGeneration((prev) => ({ ...prev, isGenerating: false }));
      }
    },
    [targetChunkId, user, selectedTopic, courseId, createGenerationCallbacks]
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
    const initialLogs: GenerationLog[] = [
      {
        id: 'ai-warning-' + Date.now(),
        message: 'İçerik analiz ediliyor...',
        step: 'INIT' as const,
        details: {},
        timestamp: new Date(),
      },
    ];
    setGeneration({
      isGenerating: true,
      logs: initialLogs,
      progress: { current: 0, total: 0 },
    });
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
        if (questionsData)
          return questionsData.map((q) => ({
            ...parseOrThrow(QuizQuestionSchema, q.question_data),
            id: q.id,
          })) as QuizQuestion[];
      }
    } catch (error) {
      logger.error('Failed to generate smart exam:', error as Error);
    } finally {
      setGeneration((prev) => ({ ...prev, isGenerating: false }));
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
    setGeneration(INITIAL_GENERATION_STATE);
    setExistingQuestions([]);
    loadTopics();
  }, [loadTopics]);

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
          arsiv: 0,
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
          arsiv: 0,
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
    loading,
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
    handleStartSmartExam,
    resetState,
  };
}
