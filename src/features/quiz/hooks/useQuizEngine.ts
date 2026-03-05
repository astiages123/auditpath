import { useMemo } from 'react';
import {
  QuizResponseType,
  QuizResults,
  QuizState,
} from '@/features/quiz/types';
import { useQuizPersistence } from './useQuizPersistence';
import { useQuizEngineSession } from './useQuizEngineSession';
import { useQuizEngineResults } from './useQuizEngineResults';
import { useQuizEngineNavigation } from './useQuizEngineNavigation';

export interface UseQuizEngineReturn {
  state: QuizState;
  results: QuizResults;
  progressIndex: number;
  startQuiz: (
    userId: string,
    courseId: string,
    chunkId?: string
  ) => Promise<void>;
  selectAnswer: (index: number) => void;
  submitAnswer: (type?: QuizResponseType) => Promise<void>;
  nextQuestion: () => void;
  previousQuestion: () => void;
  toggleExplanation: () => void;
  resetState: () => void;
}

/**
 * Quiz çözüm sürecini koordine eden ana hook.
 * Oturum, sonuç ve navigasyon ayrı alt hook'lara ayrılmıştır.
 */
export function useQuizEngine(courseId: string): UseQuizEngineReturn {
  const { clearEngine } = useQuizPersistence(courseId);
  const {
    state,
    results,
    sessionContext,
    stateRef,
    resultsRef,
    startQuiz,
    updateState,
    setState,
    setResults,
    resetState,
    startTimer,
    stopTimer,
    resetTimer,
    progressIndex,
  } = useQuizEngineSession(courseId);
  const { submitAnswer } = useQuizEngineResults({
    stateRef,
    resultsRef,
    sessionContext,
    setState,
    setResults,
    updateState,
    stopTimer,
    startTimer,
  });
  const { selectAnswer, nextQuestion, previousQuestion, toggleExplanation } =
    useQuizEngineNavigation({
      stateRef,
      resultsRef,
      updateState,
      resetTimer,
      startTimer,
      stopTimer,
      clearPersistedEngine: clearEngine,
    });

  return useMemo(
    () => ({
      state,
      results,
      progressIndex,
      startQuiz,
      selectAnswer,
      submitAnswer,
      nextQuestion,
      previousQuestion,
      toggleExplanation,
      resetState,
    }),
    [
      state,
      results,
      progressIndex,
      startQuiz,
      selectAnswer,
      submitAnswer,
      nextQuestion,
      previousQuestion,
      toggleExplanation,
      resetState,
    ]
  );
}
