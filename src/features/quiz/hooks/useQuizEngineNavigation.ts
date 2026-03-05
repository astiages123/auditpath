import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { QuizResults, QuizState } from '@/features/quiz/types';
import {
  calculateNextQuestionState,
  calculatePreviousQuestionState,
} from '@/features/quiz/logic/quizEngineHelpers';

interface UseQuizEngineNavigationOptions {
  stateRef: MutableRefObject<QuizState>;
  resultsRef: MutableRefObject<QuizResults>;
  updateState: (patch: Partial<QuizState>) => void;
  resetTimer: () => void;
  startTimer: () => void;
  stopTimer: () => number;
  clearPersistedEngine: () => void;
}

export function useQuizEngineNavigation({
  stateRef,
  resultsRef,
  updateState,
  resetTimer,
  startTimer,
  stopTimer,
  clearPersistedEngine,
}: UseQuizEngineNavigationOptions) {
  const selectAnswer = useCallback(
    (index: number) => {
      const currentState = stateRef.current;
      if (
        currentState.isAnswered ||
        currentState.isReviewMode ||
        !currentState.currentQuestion
      ) {
        return;
      }

      updateState({
        selectedAnswer: currentState.selectedAnswer === index ? null : index,
      });
    },
    [stateRef, updateState]
  );

  const nextQuestion = useCallback(() => {
    const patch = calculateNextQuestionState(
      stateRef.current,
      resultsRef.current
    );
    updateState(patch);

    if (patch.queue) {
      if (patch.isReviewMode) {
        stopTimer();
      } else {
        resetTimer();
        startTimer();
      }
    } else {
      clearPersistedEngine();
    }
  }, [
    stateRef,
    resultsRef,
    updateState,
    stopTimer,
    resetTimer,
    startTimer,
    clearPersistedEngine,
  ]);

  const previousQuestion = useCallback(() => {
    const patch = calculatePreviousQuestionState(stateRef.current);
    if (patch) {
      stopTimer();
      updateState(patch);
    }
  }, [stateRef, updateState, stopTimer]);

  const toggleExplanation = useCallback(() => {
    updateState({ showExplanation: !stateRef.current.showExplanation });
  }, [stateRef, updateState]);

  return {
    selectAnswer,
    nextQuestion,
    previousQuestion,
    toggleExplanation,
  };
}
