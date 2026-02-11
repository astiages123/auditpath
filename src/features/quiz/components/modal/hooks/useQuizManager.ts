'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth';
import {
  getCourseTopicsWithCounts,
  getFirstChunkIdForTopic,
  getTopicCompletionStatus,
  getTopicQuestionCount,
} from '@/shared/lib/core/client-db';
import {
  TopicCompletionStats,
  TopicWithCounts,
} from '@/shared/types/efficiency';
import { ExamService } from '../../../core/engine';
import { type QuizQuestion } from '../../../core/types';
import * as Repository from '@/features/quiz/api/repository';
import { type GenerationLog, QuizFactory } from '@/features/quiz/core/factory';

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
  useEffect(() => {
    if (isQuizActive) {
      setQuizState(QuizState.ACTIVE);
    } else if (isGeneratingExam) {
      setQuizState(QuizState.MAPPING);
    } else if (completionStatus) {
      if (completionStatus.aiLogic) {
        setQuizState(QuizState.BRIEFING);
      } else {
        setQuizState(QuizState.NOT_ANALYZED);
      }
    } else {
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
        console.log('DEBUG - Quiz Topic Status:', {
          topic: selectedTopic.name,
          antrenman_quota: status.antrenman.quota,
          status_object: status,
        });
      } else {
        setTargetChunkId(null);
        setCompletionStatus(null);
      }
    }
    loadData();
  }, [selectedTopic, courseId, user]);

  const handleStartQuiz = () => {
    setExistingQuestions([]);
    setIsQuizActive(true);
  };

  const handleGenerate = async () => {
    if (!targetChunkId || !user) return;

    setIsGeneratingExam(true);
    setExamLogs([]);
    setExamProgress({ current: 0, total: 0 });

    try {
      const factory = new QuizFactory();
      await factory.generateForChunk(targetChunkId, {
        onLog: (log: GenerationLog) => {
          setExamLogs((prev) => [log, ...prev].slice(0, 50));
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
          console.error('Generation error:', err);
          setIsGeneratingExam(false);
        },
      });
    } catch (error) {
      console.error('Failed to generate:', error);
      setIsGeneratingExam(false);
    }
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
          ...(q.question_data as unknown as QuizQuestion),
          id: q.id,
        })) as QuizQuestion[];

        setExistingQuestions(formattedQuestions);
        setSelectedTopic({
          name: 'Karma Deneme Sınavı',
          questionCount: formattedQuestions.length,
          isCompleted: false,
        } as unknown as TopicWithCounts);
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
            setExamLogs((prev) => [log, ...prev].slice(0, 50)),
          onQuestionSaved: (count: number) =>
            setExamProgress((prev) => ({
              ...prev,
              current: count,
            })),
          onComplete: () => {},
          onError: (err: Error) => {
            console.error('Exam generation error:', err);
          },
        }
      );

      if (result.success && result.questionIds.length > 0) {
        const questionsData = await Repository.fetchQuestionsByIds(
          result.questionIds
        );

        if (questionsData) {
          const formattedQuestions = questionsData.map((q) => {
            const data = q.question_data as unknown as QuizQuestion;
            return {
              ...data,
              id: q.id,
            };
          }) as QuizQuestion[];

          setExistingQuestions(formattedQuestions);
          setSelectedTopic({
            name: 'Karma Deneme Sınavı',
            questionCount: formattedQuestions.length,
            isCompleted: false,
          } as unknown as TopicWithCounts);
          setIsQuizActive(true);
        }
      }
    } catch (error) {
      console.error('Failed to start smart exam:', error);
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
