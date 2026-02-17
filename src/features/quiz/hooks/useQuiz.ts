/**
 * useQuiz Hook
 *
 * State management for the quiz flow, using specialized internal hooks.
 */

import { useCallback } from "react";
import {
  QuizQuestion,
  QuizResults,
  QuizState,
} from "@/features/quiz/types";

// Internal Hooks
import { useCoreState } from "./use-quiz/useCoreState";
import { useInteractionActions } from "./use-quiz/useInteractionActions";
import { useNavigationActions } from "./use-quiz/useNavigationActions";
import { useContentGenerator } from "./use-quiz/useContentGenerator";

export interface UseQuizReturn {
  state: QuizState;
  results: QuizResults;
  generateBatch: (
    count: number,
    params: { type: "chunk"; chunkId: string; userId?: string },
  ) => Promise<void>;
  startQuiz: () => void;
  selectAnswer: (index: number) => void;
  confirmAnswer: (userId: string, courseId: string) => Promise<void>;
  markAsBlank: () => void;
  nextQuestion: (userId: string, courseId: string) => Promise<void>;
  previousQuestion: () => void;
  toggleExplanation: () => void;
  reset: () => void;
  retry: () => Promise<void>;
  loadQuestions: (questions: QuizQuestion[]) => void;
}

export interface UseQuizConfig {
  recordResponse?: (
    questionId: string,
    responseType: "correct" | "incorrect" | "blank",
    selectedAnswer: number | null,
    timeSpentMs: number,
    diagnosis?: string,
    insight?: string,
  ) => Promise<unknown>;
}

export function useQuiz(config: UseQuizConfig = {}): UseQuizReturn {
  const {
    state,
    updateState,
    results,
    setResults,
    updateResults,
    timerRef,
    sessionContextRef,
    lastParams,
    setParams,
  } = useCoreState();

  const loadQuestionsIntoState = useCallback(
    (questions: QuizQuestion[]) => {
      if (questions.length === 0) return;
      const [first, ...rest] = questions;
      updateState({
        currentQuestion: first,
        queue: rest,
        totalToGenerate: questions.length,
        generatedCount: questions.length,
        isLoading: false,
      });
    },
    [updateState],
  );

  const { generateBatch } = useContentGenerator({
    updateState,
    loadQuestionsIntoState,
    setParams,
    sessionContextRef,
  });

  const { selectAnswer, confirmAnswer, markAsBlank } = useInteractionActions({
    state,
    updateState,
    updateResults,
    timerRef,
    sessionContextRef,
    config,
  });

  const { nextQuestion, previousQuestion, toggleExplanation, reset } =
    useNavigationActions({
      state,
      results,
      updateState,
      setResults,
      timerRef,
    });

  const startQuiz = useCallback(() => {
    updateState({ hasStarted: true });
    timerRef.current.start();
  }, [updateState, timerRef]);

  const retry = useCallback(async () => {
    if (lastParams && lastParams.params.userId) {
      reset();
      await generateBatch(lastParams.count, lastParams.params);
    }
  }, [lastParams, generateBatch, reset]);

  const loadQuestions = useCallback(
    (questions: QuizQuestion[]) => {
      if (questions.length > 0) {
        loadQuestionsIntoState(questions);
        timerRef.current.reset();
        timerRef.current.start();
      }
    },
    [loadQuestionsIntoState, timerRef],
  );

  return {
    state,
    results,
    generateBatch,
    startQuiz,
    selectAnswer,
    confirmAnswer,
    markAsBlank,
    nextQuestion,
    previousQuestion,
    toggleExplanation,
    reset,
    retry,
    loadQuestions,
  };
}
