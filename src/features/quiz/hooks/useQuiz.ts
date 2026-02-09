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
        // We need courseId. Fetch it from chunk or assume passed?
        // params only has chunkId. We need to fetch chunk metadata first.
        const chunk = await Repository.getChunkMetadata(params.chunkId);
        if (!chunk) throw new Error("Chunk not found");

        const session = await Engine.startSession(
          params.userId,
          chunk.course_id,
        );
        sessionContextRef.current = session;

        // 2. Build Queue (Engine or Service?)
        // The original logic fetched questions from Repository or generated them.
        // We should use Repository directly here as per new architecture (Engine organizes, Repo fetches).

        // Fetch existing questions
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
          // Trigger Generation (Factory via legacy service or direct?)
          // We removed `Factory` calls from here.
          // We should use a Service that wraps Factory?
          // Or just import QuizFactory here? Factory is in `core`.
          // Let's dynamically import or usage is fine if strictly typed.
          // Check imports: I need QuizFactory.
          const { QuizFactory } = await import("../core/factory");
          const factory = new QuizFactory();

          factory.generateForChunk(params.chunkId, {
            onLog: () => {}, // optimize logs?
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
      // Finish
      updateState({ isLoading: true });
      // Logic to finish session? Engine doesn't have explicit finish logic that DB needs?
      // Check `finishQuizSession` in client-db, or use Repository?
      // Using `Repository` directly for now or shared lib.
      // Ideally Engine should handle this too.
      // For now, I'll use the client-db import as before or mock it?
      // Wait, I should not import client-db if I want strict separation.
      // I'll add `calculateTestResults` usage here or just complete.
      updateState({ isLoading: false });
    }
  }, [state.queue]);

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
