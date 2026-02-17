import { useCallback } from 'react';
import { QuizResults, QuizState } from '@/features/quiz/types';
import {
  calculateInitialResults,
  calculateTestResults,
} from '@/features/quiz/logic/algorithms/scoring';

interface UseNavigationActionsProps {
  state: QuizState;
  results: QuizResults;
  updateState: (patch: Partial<QuizState>) => void;
  setResults: (results: QuizResults) => void;
  timerRef: React.RefObject<
    | {
        reset: () => void;
        start: () => void;
        clear: () => void;
      }
    | undefined
  >;
}

export function useNavigationActions({
  state,
  results,
  updateState,
  setResults,
  timerRef,
}: UseNavigationActionsProps) {
  const nextQuestion = useCallback(async () => {
    const newHistory = [...state.history];
    if (state.currentQuestion && state.isAnswered) {
      newHistory.push({
        ...state.currentQuestion,
        userAnswer: state.selectedAnswer,
        isCorrect: state.isCorrect,
      });
    }

    if (state.queue.length > 0) {
      const [next, ...rest] = state.queue;
      updateState({
        currentQuestion: next,
        queue: rest,
        history: newHistory,
        selectedAnswer: null,
        isAnswered: false,
        showExplanation: false,
        isCorrect: null,
        lastSubmissionResult: null,
      });
      timerRef.current?.reset();
      timerRef.current?.start();
    } else {
      const summary = calculateTestResults(
        results.correct,
        results.incorrect,
        results.blank,
        results.totalTimeMs
      );

      updateState({
        isLoading: false,
        summary,
        currentQuestion: null,
        history: newHistory,
      });
    }
  }, [state, results, updateState, timerRef]);

  const previousQuestion = useCallback(() => {
    if (state.history.length === 0) return;

    const newHistory = [...state.history];
    const prev = newHistory.pop()!;

    const newQueue = state.currentQuestion
      ? [state.currentQuestion, ...state.queue]
      : state.queue;

    updateState({
      currentQuestion: prev,
      queue: newQueue,
      history: newHistory,
      selectedAnswer: prev.userAnswer,
      isAnswered: true,
      showExplanation: true,
      isCorrect: prev.isCorrect,
      lastSubmissionResult: null,
    });
  }, [state, updateState]);

  const toggleExplanation = useCallback(() => {
    updateState({ showExplanation: !state.showExplanation });
  }, [state.showExplanation, updateState]);

  const reset = useCallback(() => {
    timerRef.current?.clear();
    setResults(calculateInitialResults());
    updateState({
      currentQuestion: null,
      queue: [],
      totalToGenerate: 0,
      generatedCount: 0,
      isLoading: false,
      error: null,
      selectedAnswer: null,
      isAnswered: false,
      showExplanation: false,
      isCorrect: null,
      hasStarted: false,
      summary: null,
      history: [],
    });
  }, [updateState, setResults, timerRef]);

  return { nextQuestion, previousQuestion, toggleExplanation, reset };
}
