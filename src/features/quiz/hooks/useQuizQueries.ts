import { useMutation, useQuery } from '@tanstack/react-query';
import {
  fetchQuestionsByCourse,
  fetchQuestionsByIds,
  getReviewQueue,
  startQuizSession,
  submitQuizAnswer,
} from '@/features/quiz/services/quizService';
import { generateForChunk } from '@/features/quiz/logic/quizParser';
import { QuizResponseType, SessionContext } from '@/features/quiz/types';
import { GeneratorCallbacks } from '@/features/quiz/types';

export function useStartQuizSessionMutation() {
  return useMutation({
    mutationFn: ({ userId, courseId }: { userId: string; courseId: string }) =>
      startQuizSession(userId, courseId),
  });
}

export function useGetReviewQueueQuery(
  ctx: SessionContext | null,
  limit: number = 10,
  targetChunkId?: string
) {
  return useQuery({
    queryKey: [
      'quiz',
      'reviewQueue',
      ctx?.userId,
      ctx?.courseId,
      targetChunkId,
      limit,
    ],
    queryFn: () => getReviewQueue(ctx!, limit, targetChunkId),
    enabled: !!ctx,
  });
}

export function useFetchQuestionsByIdsQuery(ids: string[]) {
  return useQuery({
    queryKey: ['quiz', 'questionsByIds', ids],
    queryFn: () => fetchQuestionsByIds(ids),
    enabled: ids.length > 0,
  });
}

export function useFetchQuestionsByCourseQuery(
  courseId: string,
  limit: number = 10,
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ['quiz', 'questionsByCourse', courseId, limit],
    queryFn: () => fetchQuestionsByCourse(courseId, limit),
    enabled,
  });
}

export function useGenerateChunkMutation() {
  return useMutation({
    mutationFn: ({
      chunkId,
      callbacks,
      options,
    }: {
      chunkId: string;
      callbacks: GeneratorCallbacks;
      options?: {
        targetCount?: number;
        usageType?: 'antrenman' | 'deneme';
        userId?: string;
      };
    }) => generateForChunk(chunkId, callbacks, options),
  });
}

export function useSubmitAnswerMutation() {
  return useMutation({
    mutationFn: ({
      ctx,
      questionId,
      chunkId,
      responseType,
      timeSpentMs,
      selectedAnswer,
    }: {
      ctx: { userId: string; courseId: string; sessionNumber: number };
      questionId: string;
      chunkId: string | null;
      responseType: QuizResponseType;
      timeSpentMs: number;
      selectedAnswer: number | null;
    }) =>
      submitQuizAnswer(
        ctx,
        questionId,
        chunkId,
        responseType,
        timeSpentMs,
        selectedAnswer
      ),
  });
}
