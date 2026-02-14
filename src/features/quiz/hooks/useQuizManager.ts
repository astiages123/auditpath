import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getCourseTopicsWithCounts,
  getFirstChunkIdForTopic,
  getTopicCompletionStatus,
  getTopicQuestionCount,
} from '@/lib/clientDb';
import { TopicCompletionStats, TopicWithCounts } from '@/types';
import { ExamService } from '@/features/quiz/logic/quizEngine';
import { type QuizQuestion } from '@/features/quiz/types';
import * as Repository from '@/features/quiz/services/quizRepository';
import {
  type GenerationLog,
  QuizFactory,
} from '@/features/quiz/logic/quizFactory';
import { parseOrThrow } from '@/utils/helpers';
import { QuizQuestionSchema } from '@/features/quiz/types';
import { logger } from '@/utils/logger';
import { MAX_LOG_ENTRIES } from '@/config';

export enum QuizState {
  NOT_ANALYZED = 'NOT_ANALYZED',
  MAPPING = 'MAPPING',
  BRIEFING = 'BRIEFING',
  ACTIVE = 'ACTIVE',
}

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
  const [topics, setTopics] = useState<TopicWithCounts[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithCounts | null>(
    null
  );
  const [targetChunkId, setTargetChunkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Status State
  const [completionStatus, setCompletionStatus] =
    useState<TopicCompletionStats | null>(null);

  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>(
    []
  );

  // Quiz Engine State
  const [isQuizActive, setIsQuizActive] = useState(false);

  // Exam Generation State
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);

  // Quiz Flow State
  const [quizState, setQuizState] = useState<QuizState>(QuizState.NOT_ANALYZED);
  const [examLogs, setExamLogs] = useState<GenerationLog[]>([]);
  const [examProgress, setExamProgress] = useState({ current: 0, total: 0 });

  // Determine State
  // src/features/quiz/components/modal/hooks/useQuizManager.ts içindeki ilgili kısım:

  useEffect(() => {
    if (isQuizActive) {
      setQuizState(QuizState.ACTIVE);
    } else if (isGeneratingExam) {
      setQuizState(QuizState.MAPPING);
    } else if (
      completionStatus &&
      completionStatus.aiLogic &&
      completionStatus.concepts &&
      completionStatus.concepts.length > 0
    ) {
      // Sadece hem aiLogic hem de kavramlar varsa BRIEFING'e geç
      setQuizState(QuizState.BRIEFING);
    } else {
      // Diğer tüm durumlarda (veri yoksa veya eksikse) ANALİZ EDİLMEDİ göster
      setQuizState(QuizState.NOT_ANALYZED);
    }
  }, [completionStatus, isQuizActive, isGeneratingExam]);

  // Fetch topics when modal opens
  useEffect(() => {
    async function loadTopics() {
      if (isOpen && courseId) {
        setLoading(true);
        const data = await getCourseTopicsWithCounts(courseId);
        setTopics(data);
        setLoading(false);
      }
    }
    loadTopics();
  }, [isOpen, courseId]);

  // Fetch question count and chunk ID when topic is selected
  useEffect(() => {
    async function loadData() {
      if (selectedTopic && courseId && user) {
        const chunkRes = await getFirstChunkIdForTopic(
          courseId,
          selectedTopic.name
        );
        setTargetChunkId(chunkRes);

        const [, status] = await Promise.all([
          getTopicQuestionCount(courseId, selectedTopic.name),
          getTopicCompletionStatus(user.id, courseId, selectedTopic.name),
        ]);

        setCompletionStatus(status);
      } else {
        setTargetChunkId(null);
        setCompletionStatus(null);
      }
    }
    loadData();
  }, [selectedTopic, courseId, user]);

  const handleGenerate = async (mappingOnly: boolean = true) => {
    if (!targetChunkId || !user) return;

    setIsGeneratingExam(true);
    setExamLogs([]);
    setExamProgress({ current: 0, total: 0 });

    try {
      const factory = new QuizFactory();
      await factory.generateForChunk(
        targetChunkId,
        {
          onLog: (log: GenerationLog) => {
            setExamLogs((prev) => [log, ...prev].slice(0, MAX_LOG_ENTRIES));
          },
          onQuestionSaved: (count: number) => {
            setExamProgress((prev) => ({ ...prev, current: count }));
          },
          onComplete: async () => {
            if (selectedTopic && courseId) {
              const newStatus = await getTopicCompletionStatus(
                user.id,
                courseId,
                selectedTopic.name
              );
              setCompletionStatus(newStatus);
            }
            setIsGeneratingExam(false);
          },
          onError: (err: string) => {
            logger.error('Generation error:', { message: err });
            setIsGeneratingExam(false);
          },
        },
        { mappingOnly }
      );
    } catch (error) {
      logger.error('Failed to generate:', error as Error);
      setIsGeneratingExam(false);
    }
  };

  const handleStartQuiz = () => {
    if (
      completionStatus &&
      completionStatus.antrenman.existing < completionStatus.antrenman.quota
    ) {
      handleGenerate(false); // Start actual question production
      return;
    }
    setExistingQuestions([]);
    setIsQuizActive(true);
  };

  const handleBackToTopics = () => {
    setSelectedTopic(null);
    setIsQuizActive(false);
    setIsGeneratingExam(false);
    setExamLogs([]);
    setExistingQuestions([]);
    // Reload stats to reflect new progress
    if (courseId) {
      getCourseTopicsWithCounts(courseId).then(setTopics);
    }
  };

  const handleStartSmartExam = async () => {
    if (!user || !courseId || !courseName) return;

    // 1. Try to fetch from pool first (SAK optimized but instant)
    const poolResult = await ExamService.fetchSmartExamFromPool(
      courseId,
      user.id
    );

    if (poolResult && poolResult.questionIds.length >= 20) {
      // INSTANT BYPASS
      const questionsData = await Repository.fetchQuestionsByIds(
        poolResult.questionIds
      );
      if (questionsData) {
        const formattedQuestions = questionsData.map((q) => ({
          ...parseOrThrow(QuizQuestionSchema, q.question_data),
          id: q.id,
        }));

        setExistingQuestions(formattedQuestions);
        setSelectedTopic({
          name: 'Karma Deneme Sınavı',
          isCompleted: false,
          counts: {
            antrenman: 0,
            arsiv: 0,
            deneme: formattedQuestions.length,
            total: formattedQuestions.length,
          },
        });
        setIsQuizActive(true);
        return;
      }
    }

    // 2. Fallback to Generation Flow
    setIsGeneratingExam(true);
    setExamLogs([]);
    setExamProgress({ current: 0, total: 0 });

    try {
      const result = await ExamService.generateSmartExam(
        courseId,
        courseName,
        user.id,
        {
          onLog: (log: GenerationLog) =>
            setExamLogs((prev) => [log, ...prev].slice(0, MAX_LOG_ENTRIES)),
          onQuestionSaved: (count: number) =>
            setExamProgress((prev) => ({
              ...prev,
              current: count,
            })),
          onComplete: () => {},
          onError: (err: Error) => {
            logger.error('Exam generation error:', err);
          },
        }
      );

      if (result.success && result.questionIds.length > 0) {
        const questionsData = await Repository.fetchQuestionsByIds(
          result.questionIds
        );

        if (questionsData) {
          const formattedQuestions = questionsData.map((q) => ({
            ...parseOrThrow(QuizQuestionSchema, q.question_data),
            id: q.id,
          }));

          setExistingQuestions(formattedQuestions);
          setSelectedTopic({
            name: 'Karma Deneme Sınavı',
            isCompleted: false,
            counts: {
              antrenman: 0,
              arsiv: 0,
              deneme: formattedQuestions.length,
              total: formattedQuestions.length,
            },
          });
          setIsQuizActive(true);
        }
      }
    } catch (error) {
      logger.error('Failed to start smart exam:', error as Error);
    } finally {
      setIsGeneratingExam(false);
    }
  };

  const resetState = () => {
    setSelectedTopic(null);
    setIsQuizActive(false);
    setExistingQuestions([]);
  };

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
    isGeneratingExam,
    quizState,
    examLogs,
    examProgress,
    handleStartQuiz,
    handleGenerate,
    handleBackToTopics,
    handleStartSmartExam,
    resetState,
  };
}
