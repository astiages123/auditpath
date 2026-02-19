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
import { AI_MODE } from '@/utils/aiConfig';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { parseOrThrow } from '@/utils/validation';
import { MAX_LOG_ENTRIES } from '../utils/constants';

export enum QuizState {
  NOT_ANALYZED = 'NOT_ANALYZED',
  MAPPING = 'MAPPING',
  BRIEFING = 'BRIEFING',
  ACTIVE = 'ACTIVE',
}

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

export function useQuizManager({
  isOpen,
  courseId,
  courseName,
}: UseQuizManagerProps) {
  const { user } = useAuth();

  // --- Topics State ---
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

  // --- Generation State ---
  const [generation, setGeneration] = useState<GenerationState>(
    INITIAL_GENERATION_STATE
  );

  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>(
    []
  );
  const [isQuizActive, setIsQuizActive] = useState(false);

  // --- Topics Logic ---
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

  // --- Derived State ---
  const quizState = (() => {
    if (isQuizActive) return QuizState.ACTIVE;
    if (generation.isGenerating) return QuizState.MAPPING;
    if (
      completionStatus?.aiLogic &&
      completionStatus?.concepts &&
      completionStatus.concepts.length > 0
    ) {
      return QuizState.BRIEFING;
    }
    return QuizState.NOT_ANALYZED;
  })();

  // --- Generation Handlers ---
  const handleGenerate = useCallback(
    async (_mappingOnly: boolean = true) => {
      if (!targetChunkId) return;

      const initialLogs: GenerationLog[] =
        AI_MODE === 'TEST'
          ? [
              {
                id: 'ai-warning-' + Date.now(),
                message:
                  'İçerik analiz ediliyor, bu işlem birkaç dakika sürebilir...',
                step: 'INIT',
                details: {},
                timestamp: new Date(),
              },
            ]
          : [];

      setGeneration({
        isGenerating: true,
        logs: initialLogs,
        progress: { current: 0, total: 0 },
      });

      try {
        await generateForChunk(
          targetChunkId,
          {
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
              if (selectedTopic && user) {
                const newStatus = await getTopicCompletionStatus(
                  user.id,
                  courseId,
                  selectedTopic.name
                );
                setCompletionStatus(newStatus);
              }
              setGeneration((prev) => ({ ...prev, isGenerating: false }));
            },
            onError: (err: string) => {
              logger.error('Generation error:', { message: err });
              setGeneration((prev) => ({ ...prev, isGenerating: false }));
            },
          },
          {}
        );
      } catch (error) {
        logger.error('Failed to generate:', error as Error);
        setGeneration((prev) => ({ ...prev, isGenerating: false }));
      }
    },
    [targetChunkId, user, selectedTopic, courseId]
  );

  // --- Smart Exam Logic ---
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
    const initialLogs: GenerationLog[] =
      AI_MODE === 'TEST'
        ? [
            {
              id: 'ai-warning-' + Date.now(),
              message:
                'İçerik analiz ediliyor, bu işlem birkaç dakika sürebilir...',
              step: 'INIT' as const,
              details: {},
              timestamp: new Date(),
            },
          ]
        : [];

    setGeneration({
      isGenerating: true,
      logs: initialLogs,
      progress: { current: 0, total: 0 },
    });

    try {
      const result = await QuizService.generateSmartExam(courseId, user.id, {
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
        onComplete: () => {},
        onError: (err: string) =>
          logger.error('Exam generation error:', { message: err }),
      });

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
    } finally {
      setGeneration((prev) => ({ ...prev, isGenerating: false }));
    }
    return null;
  }, [user, courseId]);

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
    quizState,
    examLogs: generation.logs,
    examProgress: generation.progress,
    handleStartQuiz,
    handleGenerate,
    handleBackToTopics,
    handleStartSmartExam,
    resetState,
    courseProgress,
  };
}
