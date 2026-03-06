import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGenerateChunkMutation,
  useStartQuizSessionMutation,
  useSubmitAnswerMutation,
} from './useQuizQueries';
import {
  fetchQuestionsByCourse,
  fetchQuestionsByIds,
  getReviewQueue,
} from '@/features/quiz/services/quizService';
import {
  MultipleChoiceQuestion,
  QuizQuestion,
  QuizResponseType,
  SessionContext,
  TrueFalseQuestion,
} from '@/features/quiz/types';

export function useQuizEngineApi() {
  const queryClient = useQueryClient();
  const startSessionMutation = useStartQuizSessionMutation();
  const generateChunkMutation = useGenerateChunkMutation();
  const submitAnswerMutation = useSubmitAnswerMutation();

  const startQuizSession = useCallback(
    async (userId: string, courseId: string) => {
      return await startSessionMutation.mutateAsync({ userId, courseId });
    },
    [startSessionMutation]
  );

  const loadQuestionsFromQueue = useCallback(
    async (
      session: SessionContext,
      chunkId?: string
    ): Promise<QuizQuestion[]> => {
      const queue = await queryClient.fetchQuery({
        queryKey: [
          'quiz',
          'reviewQueue',
          session.userId,
          session.courseId,
          chunkId,
          10,
        ],
        queryFn: () => getReviewQueue(session, 10, chunkId),
      });

      if (queue.length === 0) return [];

      const questionIds = queue.map((queueItem) => queueItem.questionId);
      const questions = await queryClient.fetchQuery({
        queryKey: ['quiz', 'questionsByIds', questionIds],
        queryFn: () => fetchQuestionsByIds(questionIds),
      });

      return questions.map(
        (question: { id: string; question_data: unknown }) => {
          const questionData = question.question_data as
            | TrueFalseQuestion
            | MultipleChoiceQuestion;
          return { ...questionData, id: question.id } as QuizQuestion;
        }
      );
    },
    [queryClient]
  );

  const generateAndLoadQuestions = useCallback(
    async (
      userId: string,
      session: SessionContext,
      chunkId: string,
      onProgress: (count: number) => void
    ): Promise<QuizQuestion[]> => {
      return new Promise((resolve, reject) => {
        generateChunkMutation
          .mutateAsync({
            chunkId,
            callbacks: {
              onLog: () => {},
              onTotalTargetCalculated: () => {},
              onQuestionSaved: onProgress,
              onComplete: async () => {
                const loadedQuestions = await loadQuestionsFromQueue(
                  session,
                  chunkId
                );
                resolve(loadedQuestions);
              },
              onError: (errorMessage: string) => {
                reject(new Error(errorMessage));
              },
            },
            options: { usageType: 'antrenman', userId },
          })
          .catch(reject);
      });
    },
    [generateChunkMutation, loadQuestionsFromQueue]
  );

  const loadRandomQuestions = useCallback(
    async (courseId: string): Promise<QuizQuestion[]> => {
      const randomQuestions = (await queryClient.fetchQuery({
        queryKey: ['quiz', 'questionsByCourse', courseId, 10],
        queryFn: () => fetchQuestionsByCourse(courseId, 10),
      })) as { id: string; question_data: unknown }[];

      return randomQuestions.map((question) => {
        const questionData = question.question_data as
          | TrueFalseQuestion
          | MultipleChoiceQuestion;
        return { ...questionData, id: question.id } as QuizQuestion;
      });
    },
    [queryClient]
  );

  const submitAnswer = useCallback(
    async (
      ctx: SessionContext,
      questionId: string,
      chunkId: string | null,
      responseType: QuizResponseType,
      timeSpentMs: number,
      selectedAnswer: number | null
    ) => {
      return await submitAnswerMutation.mutateAsync({
        ctx,
        questionId,
        chunkId,
        responseType,
        timeSpentMs,
        selectedAnswer,
      });
    },
    [submitAnswerMutation]
  );

  return useMemo(
    () => ({
      startQuizSession,
      loadQuestionsFromQueue,
      generateAndLoadQuestions,
      loadRandomQuestions,
      submitAnswer,
    }),
    [
      startQuizSession,
      loadQuestionsFromQueue,
      generateAndLoadQuestions,
      loadRandomQuestions,
      submitAnswer,
    ]
  );
}
