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

// ============================================================================
// HOOK
// ============================================================================

/**
 * Quiz motorunun veri katmanı ile iletişimini sağlayan API soyutlama hook'u.
 * Tanstack Query mutasyonlarını ve direkt servis çağrılarını birleştirir.
 */
export function useQuizEngineApi() {
  // === EXTERNAL HOOKS ===
  const queryClient = useQueryClient();
  const startSessionMutation = useStartQuizSessionMutation();
  const generateChunkMutation = useGenerateChunkMutation();
  const submitAnswerMutation = useSubmitAnswerMutation();

  // === SESSION OPERATIONS ===

  /** Yeni bir quiz oturumu başlatır */
  const startQuizSession = useCallback(
    async (userId: string, courseId: string) => {
      try {
        return await startSessionMutation.mutateAsync({ userId, courseId });
      } catch (err) {
        console.error('[useQuizEngineApi][startQuizSession] Hata:', err);
        throw err;
      }
    },
    [startSessionMutation]
  );

  // === QUESTION LOADING ===

  /**
   * Tekrar kuyruğundan (SRS) soruları yükler.
   * Belirli bir üniteye (chunk) göre filtrelenebilir.
   */
  const loadQuestionsFromQueue = useCallback(
    async (
      session: SessionContext,
      chunkId?: string
    ): Promise<QuizQuestion[]> => {
      try {
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

        return questions.map((q: { id: string; question_data: unknown }) => {
          const qd = q.question_data as
            | TrueFalseQuestion
            | MultipleChoiceQuestion;
          return { ...qd, id: q.id } as QuizQuestion;
        });
      } catch (err) {
        console.error('[useQuizEngineApi][loadQuestionsFromQueue] Hata:', err);
        throw err;
      }
    },
    [queryClient]
  );

  /**
   * Yeni sorular üretilirken ilerlemeyi raporlar ve tamamlandığında soruları döner.
   */
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
                try {
                  const qs = await loadQuestionsFromQueue(session, chunkId);
                  resolve(qs);
                } catch (err) {
                  console.error(
                    '[useQuizEngineApi][generateAndLoadQuestions][onComplete] Hata:',
                    err
                  );
                  reject(err);
                }
              },
              onError: (err: string) => {
                console.error(
                  '[useQuizEngineApi][generateAndLoadQuestions][onError] Hata:',
                  err
                );
                reject(new Error(err));
              },
            },
            options: { usageType: 'antrenman', userId },
          })
          .catch((err) => {
            console.error(
              '[useQuizEngineApi][generateAndLoadQuestions] Hata:',
              err
            );
            reject(err);
          });
      });
    },
    [generateChunkMutation, loadQuestionsFromQueue]
  );

  /** Belirli bir ders için rastgele sorular yükler */
  const loadRandomQuestions = useCallback(
    async (courseId: string): Promise<QuizQuestion[]> => {
      try {
        const randomQs = (await queryClient.fetchQuery({
          queryKey: ['quiz', 'questionsByCourse', courseId, 10],
          queryFn: () => fetchQuestionsByCourse(courseId, 10),
        })) as { id: string; question_data: unknown }[];

        return randomQs.map((q) => {
          const qd = q.question_data as
            | TrueFalseQuestion
            | MultipleChoiceQuestion;
          return { ...qd, id: q.id } as QuizQuestion;
        });
      } catch (err) {
        console.error('[useQuizEngineApi][loadRandomQuestions] Hata:', err);
        throw err;
      }
    },
    [queryClient]
  );

  // === ANSWER OPERATIONS ===

  /** Bir sorunun cevabını veritabanına gönderir */
  const submitAnswer = useCallback(
    async (
      ctx: SessionContext,
      questionId: string,
      chunkId: string | null,
      responseType: QuizResponseType,
      timeSpentMs: number,
      selectedAnswer: number | null
    ) => {
      try {
        return await submitAnswerMutation.mutateAsync({
          ctx,
          questionId,
          chunkId,
          responseType,
          timeSpentMs,
          selectedAnswer,
        });
      } catch (err) {
        console.error('[useQuizEngineApi][submitAnswer] Hata:', err);
        throw err;
      }
    },
    [submitAnswerMutation]
  );

  // === RETURN ===
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
      startSessionMutation,
      generateChunkMutation,
      submitAnswerMutation,
      queryClient,
    ]
  );
}
