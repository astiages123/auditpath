/**
 * useQuiz Hook
 *
 * State management for the quiz flow, using Engine and Repository.
 */

import { useCallback, useRef, useState } from "react";
import * as Engine from "@/features/quiz/logic/quizEngine";
import * as Repository from "@/features/quiz/services/quizRepository";
import { createTimer } from "@/features/quiz/logic/quizUtils";
import {
  type QuizQuestion,
  type QuizResults,
  type QuizState,
} from "@/features/quiz/types";
import { parseOrThrow } from "@/utils/helpers";
import { QuizQuestionSchema } from "@/features/quiz/types";
import {
  calculateInitialResults,
  calculateTestResults,
  updateResults,
} from "@/features/quiz/logic";
import { QuizFactory } from "@/features/quiz/logic/quizFactory";
import { type Database } from "@/types/database.types";

/**
 * Helper to map database row to QuizQuestion type safely.
 */
function mapRowToQuestion(
  row: Database["public"]["Tables"]["questions"]["Row"],
): QuizQuestion {
  const data = parseOrThrow(QuizQuestionSchema, row.question_data);
  return {
    ...data,
    type: data.type || "multiple_choice",
    id: row.id,
    chunk_id: row.chunk_id || undefined,
  };
}

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
    lastSubmissionResult: null,
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

  const generateBatch = useCallback(
    async (
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

          // 2. Build Queue (Engine - Waterfall Interception)
          const reviewItems = await Engine.getReviewQueue(
            session,
            count,
            params.chunkId,
          );

          if (reviewItems.length > 0) {
            const questionIds = reviewItems.map((item) => item.questionId);
            const questions = await Repository.fetchQuestionsByIds(questionIds);

            // Sort questions to match the reviewItems order
            const sorted = questionIds
              .map((id) => questions.find((q) => q.id === id))
              .filter(
                (q): q is Database["public"]["Tables"]["questions"]["Row"] =>
                  !!q,
              );

            const mapped = sorted.map(mapRowToQuestion);
            const [first, ...rest] = mapped;
            updateState({
              currentQuestion: first,
              queue: rest,
              totalToGenerate: sorted.length,
              generatedCount: sorted.length,
              isLoading: false,
            });
          } else {
            // Trigger Generation
            const factory = new QuizFactory();

            await factory.generateForChunk(
              params.chunkId,
              {
                onLog: () => {},
                onQuestionSaved: (total: number) =>
                  updateState({ generatedCount: total }),
                onComplete: async () => {
                  if (sessionContextRef.current) {
                    const reviewItems = await Engine.getReviewQueue(
                      sessionContextRef.current,
                      count,
                      params.chunkId,
                    );

                    if (reviewItems.length > 0) {
                      const questionIds = reviewItems.map(
                        (item) => item.questionId,
                      );
                      const questions = await Repository.fetchQuestionsByIds(
                        questionIds,
                      );

                      // Sort questions to match the reviewItems order
                      const sorted = questionIds
                        .map((id) => questions.find((q) => q.id === id))
                        .filter(
                          (
                            q,
                          ): q is Database["public"]["Tables"]["questions"][
                            "Row"
                          ] => !!q,
                        );

                      const mapped = sorted.map(mapRowToQuestion);
                      const [first, ...rest] = mapped;
                      updateState({
                        currentQuestion: first,
                        queue: rest,
                        totalToGenerate: sorted.length,
                        generatedCount: sorted.length,
                        isLoading: false,
                      });
                      return;
                    }
                  }
                  updateState({ isLoading: false });
                },
                onError: (err: unknown) =>
                  updateState({ error: String(err), isLoading: false }),
              },
              { targetCount: count },
            );
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error
            ? e.message
            : "Bilinmeyen hata";
          updateState({ isLoading: false, error: errorMessage });
        }
      }
    },
    [],
  );

  const startQuiz = useCallback(() => {
    updateState({ hasStarted: true });
    timerRef.current.start();
  }, []);

  const selectAnswer = useCallback(
    async (index: number) => {
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
        const result = await Engine.submitAnswer(
          sessionContextRef.current,
          state.currentQuestion.id,
          state.currentQuestion.chunk_id || null,
          type,
          timeSpent,
          index,
        );

        updateState({
          lastSubmissionResult: result,
        });
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
    },
    [state.isAnswered, state.currentQuestion, config],
  );

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
      const result = await Engine.submitAnswer(
        sessionContextRef.current,
        state.currentQuestion.id,
        state.currentQuestion.chunk_id || null,
        "blank",
        timeSpent,
        null,
      );

      updateState({
        lastSubmissionResult: result,
      });
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
        lastSubmissionResult: null,
      });
      timerRef.current.reset();
      timerRef.current.start();
    } else {
      // Finish Logic
      updateState({ isLoading: true });

      // Use a functional update to get the latest results without closure issues
      setResults((prevResults) => {
        const summary = calculateTestResults(
          prevResults.correct,
          prevResults.incorrect,
          prevResults.blank,
          prevResults.totalTimeMs,
        );

        updateState({
          isLoading: false,
          summary, // Store summary in state
          currentQuestion: null, // Clear current question to indicate finish
        });

        return prevResults;
      });
    }
  }, [state.queue]); // Removed 'results' from dependency as we use functional update

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
