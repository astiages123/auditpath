import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';
import * as Repository from '@/features/quiz/services/repositories/quizRepository';
import { QuizQuestion } from '@/features/quiz/types/quizTypes';
import { QuizQuestionSchema } from '@/features/quiz/types/quizSchemas';
import { parseOrThrow } from '@/utils/helpers';
import { slugify } from '@/utils/core';
import { refreshArchivedQuestions } from '@/features/quiz/logic/engines/backgroundEngine';
import { MOCK_QUIZ_QUESTIONS } from '@/features/quiz/services/mockQuizData';

interface UseBatchInitializationProps {
  chunkId?: string;
  courseId?: string;
  user: { id: string } | null;
  useMock?: boolean;
  initialQuestions?: QuizQuestion[];
  sessionState: {
    status: string;
    batches: { questionId: string; status: string }[][];
    currentBatchIndex: number;
  };
  quizState: {
    currentQuestion: QuizQuestion | null;
    isLoading: boolean;
    error: string | null;
  };
  initializeSession: (courseId: string) => void;
  loadQuestions: (questions: QuizQuestion[]) => void;
  generateBatch: (
    count: number,
    params: { type: 'chunk'; chunkId: string; userId: string }
  ) => void;
  setFullBatchIds: (ids: string[]) => void;
}

export function useBatchInitialization({
  chunkId,
  courseId,
  user,
  useMock,
  initialQuestions,
  sessionState,
  quizState,
  initializeSession,
  loadQuestions,
  generateBatch,
  setFullBatchIds,
}: UseBatchInitializationProps) {
  const hasStartedAutoRef = useRef(false);

  // Initialize Session
  useEffect(() => {
    if (courseId) {
      initializeSession(courseId);
    }
  }, [courseId, initializeSession]);

  const handleGenerate = useCallback(() => {
    if (chunkId && user?.id) {
      generateBatch(10, { type: 'chunk', chunkId, userId: user.id });
    }
  }, [chunkId, generateBatch, user]);

  // Auto-start generation
  useEffect(() => {
    if (useMock) return;

    if (
      !hasStartedAutoRef.current &&
      !quizState.currentQuestion &&
      !quizState.isLoading &&
      !quizState.error &&
      !initialQuestions?.length
    ) {
      if (chunkId) {
        hasStartedAutoRef.current = true;
        handleGenerate();
      }
    }
  }, [quizState, chunkId, initialQuestions, handleGenerate, useMock]);

  const fetchQuestionsByIds = async (ids: string[]) => {
    if (ids.length === 0) return [];
    const data = await Repository.fetchQuestionsByIds(ids);

    return data.map((q) => {
      const questionData = q.question_data as Partial<QuizQuestion>;
      const question = parseOrThrow(QuizQuestionSchema, {
        ...questionData,
        type: questionData.type || 'multiple_choice',
      });
      question.id = q.id;
      if (q.course?.course_slug) {
        question.courseSlug = q.course.course_slug;
      }
      if (q.chunk?.section_title) {
        question.topicSlug = slugify(q.chunk.section_title);
      }
      return question;
    });
  };

  // Load initial questions or current batch
  useEffect(() => {
    let active = true;

    async function loadBatch() {
      if (useMock) {
        const questions = MOCK_QUIZ_QUESTIONS.map((q) => {
          const questionData = JSON.parse(q.question_data);
          return {
            ...questionData,
            id: q.id,
            type: 'multiple_choice',
          } as QuizQuestion;
        });
        setFullBatchIds(questions.map((q) => q.id || ''));
        loadQuestions(questions);
        return;
      }

      if (
        sessionState.status !== 'IDLE' &&
        sessionState.status !== 'INITIALIZING' &&
        sessionState.batches.length > 0
      ) {
        const currentBatchItems =
          sessionState.batches[sessionState.currentBatchIndex];
        if (!currentBatchItems || currentBatchItems.length === 0) {
          return;
        }

        try {
          const finalIds = await refreshArchivedQuestions(
            currentBatchItems,
            chunkId || null
          );

          const questions = await fetchQuestionsByIds(finalIds);
          if (active) {
            const sortedQuestions = finalIds
              .map((id: string) => questions.find((q) => q.id === id))
              .filter(Boolean) as QuizQuestion[];

            if (sortedQuestions.length > 0) {
              setFullBatchIds(sortedQuestions.map((q) => q.id || ''));
              loadQuestions(sortedQuestions);
            }
          }
        } catch (e) {
          logger.error('Failed to load batch', e as Error);
        }
      }
    }

    if (initialQuestions && initialQuestions.length > 0) {
      setFullBatchIds(initialQuestions.map((q) => q.id || ''));
      loadQuestions(initialQuestions);
    } else {
      loadBatch();
    }

    return () => {
      active = false;
    };
  }, [
    initialQuestions,
    loadQuestions,
    sessionState.status,
    sessionState.batches,
    sessionState.currentBatchIndex,
    chunkId,
    useMock,
    setFullBatchIds,
  ]);
}
