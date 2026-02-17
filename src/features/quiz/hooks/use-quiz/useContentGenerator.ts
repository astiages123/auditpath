import { useCallback } from 'react';
import { QuizQuestion, QuizState } from '@/features/quiz/types';
import * as Repository from '@/features/quiz/services/repositories/quizRepository';
import { startSession } from '@/features/quiz/logic/engines/sessionEngine';
import { getReviewQueue } from '@/features/quiz/logic/engines/queueEngine';
import { QuizFactory } from '@/features/quiz/logic/factory/QuizFactory';
import { useTimerStore } from '@/features/pomodoro/store';
import { Database } from '@/types/database.types';

async function fetchAndMapQuestions(questionIds: string[]) {
  const questions = await Repository.fetchQuestionsByIds(questionIds);
  const sorted = questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is Database['public']['Tables']['questions']['Row'] => !!q);

  return sorted.map((row) => {
    const data = row.question_data as Record<string, unknown>;
    return {
      ...data,
      id: row.id,
      chunk_id: row.chunk_id || undefined,
      type: (data.type as string) || 'multiple_choice',
    } as QuizQuestion;
  });
}

interface UseContentGeneratorProps {
  updateState: (patch: Partial<QuizState>) => void;
  loadQuestionsIntoState: (questions: QuizQuestion[]) => void;
  setParams: (
    count: number,
    params: { type: 'chunk'; chunkId: string; userId?: string }
  ) => void;
  sessionContextRef: React.MutableRefObject<{
    sessionNumber: number;
    userId: string;
    courseId: string;
    isNewSession: boolean;
  } | null>;
}

export function useContentGenerator({
  updateState,
  loadQuestionsIntoState,
  setParams,
  sessionContextRef,
}: UseContentGeneratorProps) {
  const generateBatch = useCallback(
    async (
      count: number,
      params: { type: 'chunk'; chunkId: string; userId?: string }
    ) => {
      if (params.type !== 'chunk' || !params.userId) return;

      setParams(count, params);
      updateState({ isLoading: true, error: null });

      try {
        const chunk = await Repository.getChunkMetadata(params.chunkId);
        if (!chunk) throw new Error('Chunk not found');

        const session = await startSession(params.userId, chunk.course_id);
        sessionContextRef.current = session;

        useTimerStore.getState().setSessionId(session.sessionNumber.toString());
        useTimerStore.getState().setSessionCount(session.sessionNumber);

        const reviewItems = await getReviewQueue(
          session,
          count,
          params.chunkId
        );
        if (reviewItems.length > 0) {
          const questionIds = reviewItems.map((item) => item.questionId);
          const reviewQuestions = await fetchAndMapQuestions(questionIds);
          loadQuestionsIntoState(reviewQuestions);
          return;
        }

        const factory = new QuizFactory();
        await factory.generateForChunk(
          params.chunkId,
          {
            onTotalTargetCalculated: () => {},
            onLog: () => {},
            onQuestionSaved: (total: number) =>
              updateState({ generatedCount: total }),
            onComplete: async () => {
              if (sessionContextRef.current) {
                const refreshedItems = await getReviewQueue(
                  sessionContextRef.current,
                  count,
                  params.chunkId
                );
                if (refreshedItems.length > 0) {
                  const questionIds = refreshedItems.map(
                    (item) => item.questionId
                  );
                  const newQuestions = await fetchAndMapQuestions(questionIds);
                  loadQuestionsIntoState(newQuestions);
                  return;
                }
              }
              updateState({ isLoading: false });
            },
            onError: (err: unknown) =>
              updateState({
                error: String(err),
                isLoading: false,
              }),
          },
          { targetCount: count }
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Bilinmeyen hata';
        updateState({ isLoading: false, error: errorMessage });
      }
    },
    [updateState, loadQuestionsIntoState, setParams, sessionContextRef]
  );

  return { generateBatch };
}
