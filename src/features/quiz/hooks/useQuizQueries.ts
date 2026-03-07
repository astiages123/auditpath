import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchQuestionsByCourse } from '@/features/quiz/services/quizRepository';
import { fetchQuestionsByIds } from '@/features/quiz/services/quizReadService';
import {
  getReviewQueue,
  startQuizSession,
} from '@/features/quiz/services/quizHistoryService';
import { submitQuizAnswer } from '@/features/quiz/services/quizSubmissionService';
import { generateForChunk } from '@/features/quiz/logic/quizParser';
import { QuizResponseType, SessionContext } from '@/features/quiz/types';
import { GeneratorCallbacks } from '@/features/quiz/types';

/**
 * Tekrar kuyruğunu (SRS) getirmek için query hook'u.
 *
 * @param ctx - Seans bağlamı
 * @param limit - Getirilecek soru limiti
 * @param targetChunkId - Hedef ünite ID'si (opsiyonel)
 */
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
    queryFn: () => {
      if (!ctx) throw new Error('Seans bağlamı eksik');
      return getReviewQueue(ctx, limit, targetChunkId);
    },
    enabled: !!ctx,
  });
}

/**
 * ID listesine göre soru verilerini getirmek için query hook'u.
 *
 * @param ids - Soru ID listesi
 */
export function useFetchQuestionsByIdsQuery(ids: string[]) {
  return useQuery({
    queryKey: ['quiz', 'questionsByIds', ids],
    queryFn: () => fetchQuestionsByIds(ids),
    enabled: ids.length > 0,
  });
}

/**
 * Kurs bazlı rastgele sorular getirmek için query hook'u.
 *
 * @param courseId - Kurs ID'si
 * @param limit - Soru limiti
 * @param enabled - Sorgu aktif mi?
 */
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

/**
 * Quiz oturumu başlatmak için mutasyon hook'u.
 */
export function useStartQuizSessionMutation() {
  return useMutation({
    mutationFn: async ({
      userId,
      courseId,
    }: {
      userId: string;
      courseId: string;
    }) => {
      return await startQuizSession(userId, courseId);
    },
  });
}

/**
 * Yeni soru parçası (chunk) üretmek için mutasyon hook'u.
 */
export function useGenerateChunkMutation() {
  return useMutation({
    mutationFn: async ({
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
    }) => {
      return await generateForChunk(chunkId, callbacks, options);
    },
  });
}

/**
 * Soru cevabını kaydetmek için mutasyon hook'u.
 */
export function useSubmitAnswerMutation() {
  return useMutation({
    mutationFn: async ({
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
    }) => {
      return await submitQuizAnswer(
        ctx,
        questionId,
        chunkId,
        responseType,
        timeSpentMs,
        selectedAnswer
      );
    },
  });
}
