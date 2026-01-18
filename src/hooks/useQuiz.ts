/**
 * useQuiz Hook
 *
 * State management for the quiz generation flow.
 * Handles question generation, answer selection, and UI state.
 */

import { useState, useCallback } from 'react';
import {
  QuizQuestion,
  QuizGenerationResult,
  generateQuizQuestion,
  generateQuizQuestionFromContent,
} from '@/lib/ai/quiz-api';

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
}

export interface UseQuizReturn {
  state: QuizState;
  generateFromChunk: (chunkId: string) => Promise<void>;
  generateFromContent: (
    courseName: string,
    sectionTitle: string,
    content: string,
    courseId?: string
  ) => Promise<void>;
  generateBatch: (count: number, params: { type: 'chunk'; chunkId: string; userId?: string } | { type: 'content'; courseName: string; sectionTitle: string; content: string; courseId?: string }) => Promise<void>;
  loadQuestions: (questions: QuizQuestion[]) => void;
  nextQuestion: () => void;
  selectAnswer: (index: number) => void;
  toggleExplanation: () => void;
  reset: () => void;
  retry: () => Promise<void>;
  /** Mark current question as blank (skipped without answering) */
  markAsBlank: () => void;
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
};

export function useQuiz(): UseQuizReturn {
  const [state, setState] = useState<QuizState>(initialState);
  const [lastGenerationParams, setLastGenerationParams] = useState<
    | { type: 'chunk'; chunkId: string; userId?: string }
    | { type: 'content'; courseName: string; sectionTitle: string; content: string; courseId?: string }
    | null
  >(null);

  const handleGenerationResult = useCallback((result: QuizGenerationResult, targetCount: number) => {
    if (result.success && result.question) {
      setState((prev) => {
        // If it's the first question generated in a batch or single mode, set it as current
        const isFirst = prev.currentQuestion === null;
        const newGeneratedCount = prev.generatedCount + 1;
        
        // Show loading only if we have less than 1 questions ready
        // This allows user to start answering while others generate in background
        const shouldShowLoading = newGeneratedCount < Math.min(1, targetCount);

        return {
          ...prev,
          currentQuestion: isFirst ? result.question! : prev.currentQuestion,
          queue: isFirst ? prev.queue : [...prev.queue, result.question!],
          generatedCount: newGeneratedCount,
          isLoading: shouldShowLoading,
          error: null,
        };
      });
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error || 'Soru oluşturulurken bir hata oluştu.',
      }));
    }
  }, []);

  const generateFromChunk = useCallback(
    async (chunkId: string) => {
      setState(() => ({
        ...initialState,
        isLoading: true,
        totalToGenerate: 1,
      }));
      setLastGenerationParams({ type: 'chunk', chunkId });

      console.log('Generating single question from chunk:', chunkId);
      const result = await generateQuizQuestion(chunkId);
      handleGenerationResult(result, 1);
    },
    [handleGenerationResult]
  );

  const generateFromContent = useCallback(
    async (courseName: string, sectionTitle: string, content: string, courseId?: string) => {
      setState(() => ({
        ...initialState,
        isLoading: true,
        totalToGenerate: 1,
      }));
      setLastGenerationParams({ type: 'content', courseName, sectionTitle, content, courseId });

      console.log('Generating single question from content');
      const result = await generateQuizQuestionFromContent(courseName, sectionTitle, content, courseId);
      handleGenerationResult(result, 1);
    },
    [handleGenerationResult]
  );

  const generateBatch = useCallback(
    async (count: number, params: { type: 'chunk'; chunkId: string; userId?: string } | { type: 'content'; courseName: string; sectionTitle: string; content: string; courseId?: string }) => {
      setState(() => ({
        ...initialState,
        isLoading: true,
        totalToGenerate: count,
        generatedCount: 0,
      }));
      setLastGenerationParams(params);

      console.log(`Starting batch generation of ${count} questions...`);

      // We generate sequentially to ensure order but update state incrementally
      // The state.isLoading will automatically flip to false after first few questions (handled in handleGenerationResult)
      for (let i = 0; i < count; i++) {
        // If we want to stop generation if user navigates away, we'd need an abort controller/ref check here.
        // For now, simpler is fine.
        console.log(`Batch generation ${i + 1}/${count} starting...`);
        
        let result: QuizGenerationResult;
        
        if (params.type === 'chunk') {
          result = await generateQuizQuestion(params.chunkId, { userId: params.userId });
        } else {
          result = await generateQuizQuestionFromContent(
            params.courseName,
            params.sectionTitle,
            params.content,
            params.courseId
          );
        }

        console.log(`Batch generation ${i + 1}/${count} completed. Success: ${result.success}`);
        
        // Handle result logic inline here to ensure we have access to 'count' loop variable easily
        if (result.success && result.question) {
           setState((prev) => {
            const isFirst = prev.currentQuestion === null;
            const newGeneratedCount = prev.generatedCount + 1;
            
            // Critical change: Stop loading UI as soon as we have enough questions (e.g. 1)
            // But continue generating the rest in background loop.
            const shouldShowLoading = newGeneratedCount < Math.min(1, count);

            return {
              ...prev,
              currentQuestion: isFirst ? result.question! : prev.currentQuestion,
              queue: isFirst ? prev.queue : [...prev.queue, result.question!],
              generatedCount: newGeneratedCount,
              isLoading: shouldShowLoading,
              error: null,
            };
          });
        } else {
           // On error, we might want to stop the batch or just show error.
           setState((prev) => ({
            ...prev,
            isLoading: false,
            error: result.error || `Soru ${i+1}/${count} oluşturulurken hata oluştu.`,
           }));
           break; // Stop batch on error
        }
      }
      
      console.log('Batch generation finished.');
    },
    []
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
          isStruggled: false, // Reset struggled state
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
          isStruggled: false,
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

  const reset = useCallback(() => {
    setState(initialState);
    setLastGenerationParams(null);
  }, []);

  const retry = useCallback(async () => {
    if (!lastGenerationParams) return;

    if (state.totalToGenerate > 1) {
       // Just retry 1 question.
       if (lastGenerationParams.type === 'chunk') {
         await generateFromChunk(lastGenerationParams.chunkId);
       } else {
         await generateFromContent(
            lastGenerationParams.courseName,
            lastGenerationParams.sectionTitle,
            lastGenerationParams.content
         );
       }
    } else {
      if (lastGenerationParams.type === 'chunk') {
        await generateFromChunk(lastGenerationParams.chunkId);
      } else {
        await generateFromContent(
          lastGenerationParams.courseName,
          lastGenerationParams.sectionTitle,
          lastGenerationParams.content,
          lastGenerationParams.courseId
        );
      }
    }
  }, [lastGenerationParams, generateFromChunk, generateFromContent, state.totalToGenerate]);

  return {
    state,
    generateFromChunk,
    generateFromContent,
    generateBatch,
    loadQuestions,
    nextQuestion,
    selectAnswer,
    toggleExplanation,
    reset,
    retry,
    markAsBlank,
  };
}
