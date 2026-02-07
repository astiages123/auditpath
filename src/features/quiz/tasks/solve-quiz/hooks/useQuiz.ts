/**
 * useQuiz Hook
 *
 * State management for the quiz flow, now using SolveQuizService.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { SolveQuizService } from "../solve-quiz.service";
import { QuizResults, QuizState } from "../types";
import { QuizQuestion } from "../api/solve-quiz.api";

export interface UseQuizReturn {
  state: QuizState;
  results: QuizResults;
  generateBatch: (
    count: number,
    params: { type: "chunk"; chunkId: string; userId?: string },
  ) => Promise<void>;
  startQuiz: () => void;
  selectAnswer: (index: number) => void;
  markAsBlank: () => void;
  nextQuestion: (userId: string, courseId: string) => Promise<void>;
  toggleExplanation: () => void;
  reset: () => void;
  retry: () => Promise<void>;
  /** Legacy/Utility: load questions directly */
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
  ) => Promise<any>;
}

export function useQuiz(config: UseQuizConfig = {}): UseQuizReturn {
  const [state, setState] = useState<QuizState>({
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
  });

  const [results, setResults] = useState<QuizResults>({
    correct: 0,
    incorrect: 0,
    blank: 0,
    totalTimeMs: 0,
  });

  const [lastParams, setLastParams] = useState<
    { count: number; params: any } | null
  >(null);

  const service = useMemo(() =>
    new SolveQuizService({
      onStateChange: (newState: QuizState) => setState(newState),
      onResultsUpdate: (newResults: QuizResults) => setResults(newResults),
      onLog: (msg: string, details?: any) =>
        console.log(`[QuizService] ${msg}`, details || ""),
      onError: (err: string) => console.error(`[QuizService] Error: ${err}`),
      recordResponse: config.recordResponse,
    }), [config.recordResponse]);

  const generateBatch = useCallback(async (
    count: number,
    params: { type: "chunk"; chunkId: string; userId?: string },
  ) => {
    if (params.type === "chunk" && params.userId) {
      setLastParams({ count, params });
      await service.startQuizSession({
        chunkId: params.chunkId,
        userId: params.userId,
        count,
      });
    }
  }, [service]);

  const startQuiz = useCallback(() => {
    service.beginSolving();
  }, [service]);

  const selectAnswer = useCallback((index: number) => {
    service.processAnswer(index);
  }, [service]);

  const markAsBlank = useCallback(() => {
    service.processBlank();
  }, [service]);

  const nextQuestion = useCallback(async (userId: string, courseId: string) => {
    await service.nextStep(userId, courseId);
  }, [service]);

  const toggleExplanation = useCallback(() => {
    service.toggleExplanation();
  }, [service]);

  const reset = useCallback(() => {
    service.reset();
  }, [service]);

  const retry = useCallback(async () => {
    if (lastParams) {
      await generateBatch(lastParams.count, lastParams.params);
    }
  }, [generateBatch, lastParams]);

  const loadQuestions = useCallback((questions: QuizQuestion[]) => {
    // This is a direct injection bypass, useful for some legacy flows or pre-loaded data
    // In a pure service-oriented approach, we might want to handle this differently.
    // For now, let's keep it but ideally we should update the service.
    // @ts-ignore - access internal for bypass
    service["initializeWithQuestions"](questions);
  }, [service]);

  return {
    state,
    results,
    generateBatch,
    startQuiz,
    selectAnswer,
    markAsBlank,
    nextQuestion,
    toggleExplanation,
    reset,
    retry,
    loadQuestions,
  };
}
