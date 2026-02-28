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

  const startQuizSession = async (userId: string, courseId: string) => {
    return await startSessionMutation.mutateAsync({ userId, courseId });
  };

  const loadQuestionsFromQueue = async (
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

    const questions = await queryClient.fetchQuery({
      queryKey: ['quiz', 'questionsByIds', queue.map((i) => i.questionId)],
      queryFn: () => fetchQuestionsByIds(queue.map((i) => i.questionId)),
    });

    return questions.map((q) => {
      const qd = q.question_data as TrueFalseQuestion | MultipleChoiceQuestion;
      return { ...qd, id: q.id } as QuizQuestion;
    });
  };

  const generateAndLoadQuestions = async (
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
              try {
                const qs = await loadQuestionsFromQueue(session, chunkId);
                resolve(qs);
              } catch (err) {
                reject(err);
              }
            },
            onError: (err: string) => reject(new Error(err)),
          },
          options: { usageType: 'antrenman', userId },
        })
        .catch(reject);
    });
  };

  const loadRandomQuestions = async (
    courseId: string
  ): Promise<QuizQuestion[]> => {
    const randomQs = await queryClient.fetchQuery({
      queryKey: ['quiz', 'questionsByCourse', courseId, 10],
      queryFn: () => fetchQuestionsByCourse(courseId, 10),
    });

    return randomQs.map((q) => {
      const qd = q.question_data as TrueFalseQuestion | MultipleChoiceQuestion;
      return { ...qd, id: q.id } as QuizQuestion;
    });
  };

  const submitAnswer = async (
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
  };

  return {
    startQuizSession,
    loadQuestionsFromQueue,
    generateAndLoadQuestions,
    loadRandomQuestions,
    submitAnswer,
  };
}
