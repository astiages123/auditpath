import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { updateResults } from '@/features/quiz/logic/quizCoreLogic';
import { MASTERY_THRESHOLD } from '@/features/quiz/utils/constants';
import { logger } from '@/utils/logger';
import { useCelebrationStore } from '@/features/achievements/store';
import { useQuota } from '@/features/quiz/hooks/useQuota';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useQuizEngineApi } from './useQuizEngineApi';
import type {
  QuizResponseType,
  QuizResults,
  QuizState,
  SessionContext,
} from '@/features/quiz/types';

interface UseQuizEngineResultsOptions {
  stateRef: MutableRefObject<QuizState>;
  resultsRef: MutableRefObject<QuizResults>;
  sessionContext: SessionContext | null;
  setState: Dispatch<SetStateAction<QuizState>>;
  setResults: Dispatch<SetStateAction<QuizResults>>;
  updateState: (patch: Partial<QuizState>) => void;
  stopTimer: () => number;
  startTimer: () => void;
}

export function useQuizEngineResults({
  stateRef,
  resultsRef,
  sessionContext,
  setState,
  setResults,
  updateState,
  stopTimer,
  startTimer,
}: UseQuizEngineResultsOptions) {
  const { user } = useAuth();
  const { decrementClientQuota } = useQuota(user?.id);
  const api = useQuizEngineApi();

  const submitAnswer = useCallback(
    async (type: QuizResponseType = 'correct') => {
      const currentState = stateRef.current;
      if (
        currentState.isAnswered ||
        currentState.isReviewMode ||
        !currentState.currentQuestion ||
        !sessionContext
      ) {
        return;
      }

      const actualType =
        type === 'correct'
          ? currentState.selectedAnswer === currentState.currentQuestion.a
            ? 'correct'
            : 'incorrect'
          : type;

      const timeSpent = stopTimer();
      const previousState = { ...currentState };
      const previousResults = { ...resultsRef.current };

      setResults((prev) =>
        updateResults(prev, actualType as QuizResponseType, timeSpent)
      );

      updateState({
        isAnswered: true,
        isCorrect: actualType === 'correct',
        showExplanation: actualType !== 'blank',
      });

      try {
        const result = await api.submitAnswer(
          sessionContext,
          currentState.currentQuestion.id!,
          currentState.currentQuestion.chunk_id || null,
          actualType as QuizResponseType,
          timeSpent,
          currentState.selectedAnswer
        );

        updateState({
          lastSubmissionResult: result,
          currentMastery: result.newMastery,
        });

        if (actualType === 'incorrect' && result.progressId) {
          import('@/features/quiz/services/followUpService')
            .then(({ generateFollowUpForWrongAnswer }) => {
              generateFollowUpForWrongAnswer(
                result.progressId!,
                currentState.currentQuestion?.id || '',
                currentState.selectedAnswer,
                sessionContext.userId,
                sessionContext.courseId,
                sessionContext.sessionNumber
              ).catch(() => {});
            })
            .catch((caughtError) => {
              logger.error(
                'QuizEngineResults',
                'submitAnswer',
                'Failed to load followUpService',
                caughtError
              );
            });
        }

        if (
          result.newMastery >= MASTERY_THRESHOLD &&
          currentState.currentQuestion.chunk_id
        ) {
          useCelebrationStore.getState().enqueueCelebration({
            id: `MASTERY_${currentState.currentQuestion.chunk_id}_${result.newMastery}`,
            title: 'Uzmanlık Seviyesi!',
            description: `Bu konudaki ustalığın ${result.newMastery} puana ulaştı.`,
            variant: 'achievement',
          });
        }

        decrementClientQuota();
      } catch (error) {
        logger.error(
          'QuizEngineResults',
          'submitAnswer',
          'Hata:',
          error as Error
        );
        updateState({
          error: 'Soru gönderilirken bir hata oluştu. Lütfen tekrar deneyin.',
        });
        setState(previousState);
        setResults(previousResults);
        startTimer();
      }
    },
    [
      stateRef,
      resultsRef,
      sessionContext,
      stopTimer,
      setResults,
      updateState,
      api,
      setState,
      startTimer,
      decrementClientQuota,
    ]
  );

  return { submitAnswer };
}
