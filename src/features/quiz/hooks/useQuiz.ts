/**
 * useQuiz Hook
 *
 * State management for the quiz flow, using Engine and Repository.
 */

import { useCallback, useRef, useState } from "react";
import * as Engine from "../core/engine";
import * as Repository from "../api/repository";
import { createTimer } from "../core/utils";
import { QuizResults, QuizState } from "@/features/quiz";
import { QuizQuestion } from "../core/types";
import { calculateInitialResults, updateResults } from "../algoritma/scoring";

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
  // State
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
    summary: null,
  });

  const [results, setResults] = useState<QuizResults>(
    calculateInitialResults(),
  );

  const [lastParams, setLastParams] = useState<
    {
      count: number;
      params: { type: "chunk"; chunkId: string; userId?: string };
    } | null
  >(null);

  // Refs
  const timerRef = useRef(createTimer());
  const sessionContextRef = useRef<Engine.SessionContext | null>(null);

  // Actions
  const updateState = (patch: Partial<QuizState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const generateBatch = useCallback(async (
    count: number,
    params: { type: "chunk"; chunkId: string; userId?: string },
  ) => {
    if (params.type === "chunk" && params.userId) {
      setLastParams({ count, params });
      updateState({ isLoading: true, error: null });

      try {
        // 1. Start Session (Engine)
        const chunk = await Repository.getChunkMetadata(params.chunkId);
        if (!chunk) throw new Error("Chunk not found");

        const session = await Engine.startSession(
          params.userId,
          chunk.course_id,
        );
        sessionContextRef.current = session;

        // 2. Build Queue (Engine or Service?)
        const questions = await Repository.fetchQuestionsByChunk(
          params.chunkId,
          count,
          new Set(),
        );

        if (questions.length > 0) {
          const [first, ...rest] = questions;
          updateState({
            currentQuestion: first as unknown as QuizQuestion,
            queue: rest as unknown as QuizQuestion[],
            totalToGenerate: questions.length,
            generatedCount: questions.length,
            isLoading: false,
          });
        } else {
          // Trigger Generation
          const { QuizFactory } = await import("../core/factory");
          const factory = new QuizFactory();

          await factory.generateForChunk(params.chunkId, {
            onLog: () => {},
            onQuestionSaved: (total) => updateState({ generatedCount: total }),
            onComplete: async () => {
              const updated = await Repository.fetchQuestionsByChunk(
                params.chunkId,
                count,
                new Set(),
              );
              const [first, ...rest] = updated;
              updateState({
                currentQuestion: first as unknown as QuizQuestion,
                queue: rest as unknown as QuizQuestion[],
                totalToGenerate: updated.length,
                generatedCount: updated.length,
                isLoading: false,
              });
            },
            onError: (err) => updateState({ error: err, isLoading: false }),
          }, { targetCount: count });
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Bilinmeyen hata";
        updateState({ isLoading: false, error: errorMessage });
      }
    }
  }, []);

  const startQuiz = useCallback(() => {
    updateState({ hasStarted: true });
    timerRef.current.start();
  }, []);

  const selectAnswer = useCallback(async (index: number) => {
    if (state.isAnswered || !state.currentQuestion) return;

    const timeSpent = timerRef.current.stop();
    const isCorrect = index === state.currentQuestion.a;
    const type = isCorrect ? "correct" : "incorrect";

    // Update Local Results
    setResults((prev) => updateResults(prev, type, timeSpent));

    updateState({
      selectedAnswer: index,
      isAnswered: true,
      isCorrect,
      showExplanation: true,
    });

    // Submit to Engine
    if (sessionContextRef.current && state.currentQuestion.id) {
      await Engine.submitAnswer(
        sessionContextRef.current,
        state.currentQuestion.id,
        state.currentQuestion.chunk_id || null,
        type,
        timeSpent,
        index,
      );
    }

    // Legacy Callback
    if (config.recordResponse && state.currentQuestion.id) {
      await config.recordResponse(
        state.currentQuestion.id,
        type,
        index,
        timeSpent,
        state.currentQuestion.diagnosis,
        state.currentQuestion.insight,
      );
    }
  }, [state.isAnswered, state.currentQuestion, config]);

  const markAsBlank = useCallback(async () => {
    if (state.isAnswered || !state.currentQuestion) return;

    const timeSpent = timerRef.current.stop();

    setResults((prev) => updateResults(prev, "blank", timeSpent));

    updateState({
      selectedAnswer: null,
      isAnswered: true,
      isCorrect: false,
      showExplanation: false,
    });

    // Submit to Engine
    if (sessionContextRef.current && state.currentQuestion.id) {
      await Engine.submitAnswer(
        sessionContextRef.current,
        state.currentQuestion.id,
        state.currentQuestion.chunk_id || null,
        "blank",
        timeSpent,
        null,
      );
    }

    if (config.recordResponse && state.currentQuestion.id) {
      await config.recordResponse(
        state.currentQuestion.id,
        "blank",
        null,
        timeSpent,
        state.currentQuestion.diagnosis,
        state.currentQuestion.insight,
      );
    }
  }, [state.isAnswered, state.currentQuestion, config]);

  const nextQuestion = useCallback(async () => {
    if (state.queue.length > 0) {
      const [next, ...rest] = state.queue;
      updateState({
        currentQuestion: next,
        queue: rest,
        selectedAnswer: null,
        isAnswered: false,
        showExplanation: false,
        isCorrect: null,
      });
      timerRef.current.reset();
      timerRef.current.start();
    } else {
      // Finish Logic
      updateState({ isLoading: true });

      // Calculate final results using the pure function from scoring.ts
      // We need to pass the CURRENT results state.
      // However, results state assumes the last answer update has been processed.
      // Since selectAnswer updates results immediately, keying off `results` here *might* be stale due to closure?
      // `nextQuestion` is recreated on `[state.queue]`.
      // `results` is not in dependency array.
      // We should use functional update or rely on recent render?
      // Better: we can recalculate from `results` state if we include it in deps,
      // OR we just trust `results` is up to date because `nextQuestion` is called by user AFTER answering.

      // Actually, define `calculateTestResults` import at top.
      const summary = (await import("../algoritma/scoring"))
        .calculateTestResults(
          results.correct,
          results.incorrect,
          results.blank,
          results.totalTimeMs,
        );

      updateState({
        isLoading: false,
        summary, // Store summary in state
        currentQuestion: null, // Clear current question to indicate finish
      });
    }
  }, [state.queue, results]); // Added 'results' to dependency

  const toggleExplanation = useCallback(() => {
    updateState({ showExplanation: !state.showExplanation });
  }, [state.showExplanation]);

  const reset = useCallback(() => {
    timerRef.current.clear();
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
    });
  }, []);

  const retry = useCallback(async () => {
    if (lastParams) {
      reset();
      await generateBatch(lastParams.count, lastParams.params);
    }
  }, [lastParams, generateBatch, reset]);

  const loadQuestions = useCallback((questions: QuizQuestion[]) => {
    if (questions.length > 0) {
      const [first, ...rest] = questions;
      updateState({
        currentQuestion: first,
        queue: rest,
        totalToGenerate: questions.length,
        generatedCount: questions.length,
        isLoading: false,
        summary: null,
      });
      timerRef.current.reset();
      timerRef.current.start();
    }
  }, []);

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
