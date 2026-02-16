/**
 * useQuiz Hook
 *
 * State management for the quiz flow, using Engine and Repository.
 */

import { useCallback, useRef, useState } from "react";
import * as Engine from "@/features/quiz/logic";
import * as Repository from "@/features/quiz/services/repositories/quizRepository";
import { createTimer } from "@/features/quiz/logic/utils";
import {
  type QuizQuestion,
  type QuizResults,
  type QuizState,
  type ReviewItem,
} from "@/features/quiz/types";
import {
  calculateInitialResults,
  calculateTestResults,
  updateResults,
} from "@/features/quiz/logic";
import { QuizFactory } from "@/features/quiz/logic";
import { type Database } from "@/types/database.types";
import { useTimerStore } from "@/store/useTimerStore";
import { useUIStore } from "@/store/useUIStore";
import { MASTERY_THRESHOLD } from "@/utils/constants";

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

// --- Helper Functions for generateBatch ---

async function fetchAndMapQuestions(questionIds: string[]) {
  const questions = await Repository.fetchQuestionsByIds(questionIds);

  // Sort questions to match the order of IDs if needed, or just return them.
  // Original logic sorted them.
  const sorted = questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is Database["public"]["Tables"]["questions"]["Row"] => !!q);

  return sorted.map((row) => {
    const data = row.question_data as Record<string, unknown>;
    return {
      ...data,
      id: row.id,
      chunk_id: row.chunk_id || undefined,
      type: (data.type as string) || "multiple_choice",
    } as QuizQuestion;
  });
}

async function getReviewQuestionsFromSession(
  session: Engine.SessionContext,
  chunkId: string,
  count: number,
) {
  const reviewItems = await Engine.getReviewQueue(session, count, chunkId);
  if (reviewItems.length === 0) return [];

  const questionIds = reviewItems.map((item: ReviewItem) => item.questionId);
  return fetchAndMapQuestions(questionIds);
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
  const updateState = useCallback((patch: Partial<QuizState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const loadQuestionsIntoState = useCallback((questions: QuizQuestion[]) => {
    if (questions.length === 0) return;
    const [first, ...rest] = questions;
    updateState({
      currentQuestion: first,
      queue: rest,
      totalToGenerate: questions.length,
      generatedCount: questions.length,
      isLoading: false,
    });
  }, [updateState]);

  const generateBatch = useCallback(
    async (
      count: number,
      params: { type: "chunk"; chunkId: string; userId?: string },
    ) => {
      if (params.type !== "chunk" || !params.userId) return;

      setLastParams({ count, params });
      updateState({ isLoading: true, error: null });

      try {
        // 1. Start Session
        const chunk = await Repository.getChunkMetadata(params.chunkId);
        if (!chunk) throw new Error("Chunk not found");

        const session = await Engine.startSession(
          params.userId,
          chunk.course_id,
        );
        sessionContextRef.current = session;

        // Sync Timer Store
        useTimerStore.getState().setSessionId(session.sessionNumber.toString());
        useTimerStore.getState().setSessionCount(session.sessionNumber);

        // 2. Try Review Queue
        const reviewQuestions = await getReviewQuestionsFromSession(
          session,
          params.chunkId,
          count,
        );

        if (reviewQuestions.length > 0) {
          loadQuestionsIntoState(reviewQuestions);
          return;
        }

        // 3. Fallback: Generate New Questions
        const factory = new QuizFactory();
        await factory.generateForChunk(
          params.chunkId,
          {
            onLog: () => {},
            onQuestionSaved: (total: number) =>
              updateState({ generatedCount: total }),
            onComplete: async () => {
              // Check queue again after generation
              if (sessionContextRef.current) {
                const newQuestions = await getReviewQuestionsFromSession(
                  sessionContextRef.current,
                  params.chunkId,
                  count,
                );
                if (newQuestions.length > 0) {
                  loadQuestionsIntoState(newQuestions);
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
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Bilinmeyen hata";
        updateState({ isLoading: false, error: errorMessage });
      }
    },
    [updateState, loadQuestionsIntoState],
  );

  const startQuiz = useCallback(() => {
    updateState({ hasStarted: true });
    timerRef.current.start();
  }, [updateState]);

  const selectAnswer = useCallback(
    async (index: number) => {
      if (state.isAnswered || !state.currentQuestion) return;

      const timeSpent = timerRef.current.stop();
      const isCorrect = index === state.currentQuestion.a;
      const type = isCorrect ? "correct" : "incorrect";

      setResults((prev) => updateResults(prev, type, timeSpent));

      updateState({
        selectedAnswer: index,
        isAnswered: true,
        isCorrect,
        showExplanation: true,
      });

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

        // Trigger Celebration if mastery threshold reached
        if (result.newMastery >= MASTERY_THRESHOLD) {
          useUIStore.getState().actions.enqueueCelebration({
            id:
              `MASTERY_${state.currentQuestion.chunk_id}_${result.newMastery}`,
            title: "Uzmanlık Seviyesi!",
            description:
              `Bu konudaki ustalığın %${result.newMastery} seviyesine ulaştı.`,
            variant: "achievement",
          });
        }

        // Decrement Quota
        useUIStore.getState().actions.decrementQuota();
      }

      const { recordResponse } = config || {};
      if (recordResponse && state.currentQuestion.id) {
        await recordResponse(
          state.currentQuestion.id,
          type,
          index,
          timeSpent,
          state.currentQuestion.diagnosis,
          state.currentQuestion.insight,
        );
      }
    },
    [state.isAnswered, state.currentQuestion, config, updateState],
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

      // Decrement Quota
      useUIStore.getState().actions.decrementQuota();
    }

    const { recordResponse } = config || {};
    if (recordResponse && state.currentQuestion.id) {
      await recordResponse(
        state.currentQuestion.id,
        "blank",
        null,
        timeSpent,
        state.currentQuestion.diagnosis,
        state.currentQuestion.insight,
      );
    }
  }, [state.isAnswered, state.currentQuestion, config, updateState]);

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
      updateState({ isLoading: true });

      setResults((prevResults) => {
        const summary = calculateTestResults(
          prevResults.correct,
          prevResults.incorrect,
          prevResults.blank,
          prevResults.totalTimeMs,
        );

        updateState({
          isLoading: false,
          summary,
          currentQuestion: null,
        });

        return prevResults;
      });
    }
  }, [state.queue, updateState]);

  const toggleExplanation = useCallback(() => {
    updateState({ showExplanation: !state.showExplanation });
  }, [state.showExplanation, updateState]);

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
  }, [updateState]);

  const retry = useCallback(async () => {
    if (lastParams) {
      reset();
      await generateBatch(lastParams.count, lastParams.params);
    }
  }, [lastParams, generateBatch, reset]);

  const loadQuestions = useCallback((questions: QuizQuestion[]) => {
    if (questions.length > 0) {
      loadQuestionsIntoState(questions);
      timerRef.current.reset();
      timerRef.current.start();
    }
  }, [loadQuestionsIntoState]);

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
