/**
 * useQuiz Hook
 *
 * State management for the quiz generation flow.
 * Handles question generation, answer selection, and UI state.
 */

import { useCallback, useState } from "react";
import {
  fetchQuestionsForSession,
  generateQuestionsForChunk,
  QuizQuestion,
} from "@/features/quiz";
import { supabase } from "@/shared/lib/core/supabase";

export interface QuizState {
  currentQuestion: QuizQuestion | null;
  queue: QuizQuestion[];
  totalToGenerate: number;
  generatedCount: number;
  isLoading: boolean;
  error: string | null;
  selectedAnswer: number | null;
  isAnswered: boolean;
  showExplanation: boolean;
  isCorrect: boolean | null;
  hasStarted: boolean; // New state to track if user clicked start
}

export interface UseQuizReturn {
  state: QuizState;
  generateFromContent: (
    courseName: string,
    sectionTitle: string,
    content: string,
    courseId?: string,
  ) => Promise<void>;
  generateBatch: (
    count: number,
    params: { type: "chunk"; chunkId: string; userId?: string } | {
      type: "content";
      courseName: string;
      sectionTitle: string;
      content: string;
      courseId?: string;
    },
  ) => Promise<void>;
  loadQuestions: (questions: QuizQuestion[]) => void;
  nextQuestion: () => void;
  selectAnswer: (index: number) => void;
  toggleExplanation: () => void;
  reset: () => void;
  retry: () => Promise<void>;
  /** Mark current question as blank (skipped without answering) */
  markAsBlank: () => void;
  startQuiz: () => void; // method to start quiz
}

const initialState: QuizState = {
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
};

export function useQuiz(): UseQuizReturn {
  const [state, setState] = useState<QuizState>(initialState);
  const [lastGenerationParams, setLastGenerationParams] = useState<
    | { type: "chunk"; chunkId: string; userId?: string }
    | {
      type: "content";
      courseName: string;
      sectionTitle: string;
      content: string;
      courseId?: string;
    }
    | null
  >(null);

  const generateFromContent = useCallback(
    async () => {
      // Disabled per project rules: "Frontend'de soru üret vs. özelliği olmasın"
      setState((prev) => ({
        ...prev,
        error:
          "Serbest metinden soru üretimi şu an devre dışıdır. Lütfen bir ders notu seçin.",
      }));
    },
    [],
  );

  const generateBatch = useCallback(
    async (
      count: number,
      params: { type: "chunk"; chunkId: string; userId?: string } | {
        type: "content";
        courseName: string;
        sectionTitle: string;
        content: string;
        courseId?: string;
      },
    ) => {
      // START LOADING
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        generatedCount: 0,
        queue: [],
        currentQuestion: null,
      }));
      setLastGenerationParams(params);

      if (params.type === "chunk" && params.userId) {
        try {
          // 1. Fetch existing questions
          const existing = await fetchQuestionsForSession(
            params.chunkId,
            count,
            params.userId,
            "antrenman",
          );

          if (existing.length > 0) {
            const [first, ...rest] = existing;
            setState((prev) => ({
              ...prev,
              currentQuestion: first,
              queue: rest,
              generatedCount: existing.length,
              totalToGenerate: existing.length,
              isLoading: false,
            }));
            return;
          }

          // 2. If NO questions, check if we need to trigger client-side generation
          const { data: chunk } = await supabase.from("note_chunks").select(
            "status",
          ).eq("id", params.chunkId).single();

          if (chunk?.status === "PENDING" || chunk?.status === "FAILED") {
            console.log("[useQuiz] Triggering client-side generation...");

            generateQuestionsForChunk(params.chunkId, {
              onLog: (log) =>
                console.log(`[QuizGen][${log.step}] ${log.message}`),
              onQuestionSaved: (total) => {
                console.log(`[useQuiz] Question saved: ${total}`);
              },
              onComplete: async () => {
                const updated = await fetchQuestionsForSession(
                  params.chunkId,
                  count,
                  params.userId!,
                  "antrenman",
                );
                setState((prev) => ({
                  ...prev,
                  currentQuestion: updated[0] || null,
                  queue: updated.slice(1),
                  generatedCount: updated.length,
                  totalToGenerate: updated.length,
                  isLoading: false,
                }));
              },
              onError: (err) => {
                setState((prev) => ({
                  ...prev,
                  isLoading: false,
                  error: `Üretim hatası: ${err}`,
                }));
              },
            });

            return; // isLoading stays true until complete or error
          } else if (chunk?.status === "PROCESSING") {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: "Sorular şu an hazırlanıyor. Lütfen bekleyin.",
            }));
          } else {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: "Soru bulunamadı.",
            }));
          }
        } catch (e) {
          console.error("[QuizGen] Error:", e);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "Bir hata oluştu.",
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Sadece kayıtlı içerikler için soru çözülebilir.",
        }));
      }
    },
    [],
  );

  const loadQuestions = useCallback((questions: QuizQuestion[]) => {
    if (questions.length === 0) return;

    setState(() => {
      const [first, ...rest] = questions;
      return {
        ...initialState,
        currentQuestion: first,
        queue: rest,
        totalToGenerate: questions.length,
        generatedCount: questions.length,
        isLoading: false,
      };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setState((prev) => {
      if (prev.queue.length > 0) {
        const [next, ...rest] = prev.queue;
        return {
          ...prev,
          currentQuestion: next,
          queue: rest,
          selectedAnswer: null,
          isAnswered: false,
          showExplanation: false,
          isCorrect: null,
          error: null,
          // isStruggled: false, // Reset struggled state (Removed as it's not in interface)
        };
      } else {
        // No more questions in queue
        return {
          ...prev,
          currentQuestion: null,
          selectedAnswer: null,
          isAnswered: false,
          showExplanation: false,
          isCorrect: null,
          error: null,
          // isStruggled: false,
        };
      }
    });
  }, []);

  const selectAnswer = useCallback((index: number) => {
    setState((prev) => {
      if (prev.isAnswered || !prev.currentQuestion) return prev;

      const isCorrect = index === prev.currentQuestion.a;
      return {
        ...prev,
        selectedAnswer: index,
        isAnswered: true,
        isCorrect,
        showExplanation: true,
      };
    });
  }, []);

  const toggleExplanation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showExplanation: !prev.showExplanation,
    }));
  }, []);

  /**
   * Mark current question as blank (skipped without answering)
   */
  const markAsBlank = useCallback(() => {
    setState((prev) => {
      if (!prev.currentQuestion) return prev;

      return {
        ...prev,
        selectedAnswer: null,
        isAnswered: true,
        isCorrect: false,
        showExplanation: false,
      };
    });
  }, []);

  const startQuiz = useCallback(() => {
    setState((prev) => ({ ...prev, hasStarted: true }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    setLastGenerationParams(null);
  }, []);

  const retry = useCallback(async () => {
    if (!lastGenerationParams) return;

    if (lastGenerationParams.type === "chunk") {
      await generateBatch(4, lastGenerationParams);
    } else {
      await generateFromContent();
    }
  }, [lastGenerationParams, generateBatch, generateFromContent]);

  return {
    state,
    generateFromContent,
    generateBatch,
    loadQuestions,
    nextQuestion,
    selectAnswer,
    toggleExplanation,
    reset,
    retry,
    markAsBlank,
    startQuiz,
  };
}
