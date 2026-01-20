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
  fetchQuestionsForSession,
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
  hasStarted: boolean; // New state to track if user clicked start
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
        // Show loading until ALL questions are generated
        const shouldShowLoading = newGeneratedCount < targetCount;

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

      // console.log('Generating single question from chunk:', chunkId);
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

      // console.log('Generating single question from content');
      const result = await generateQuizQuestionFromContent(courseName, sectionTitle, content, courseId);
      handleGenerationResult(result, 1);
    },
    [handleGenerationResult]
  );

  const generateBatch = useCallback(
    async (count: number, params: { type: 'chunk'; chunkId: string; userId?: string } | { type: 'content'; courseName: string; sectionTitle: string; content: string; courseId?: string }) => {
      // 0. GET QUOTA logic
      let antrenmanCount = count;
      let arsivCount = 0;
      let denemeCount = 0;

      if (params.type === 'chunk') {
          try {
             const { getQuizQuotaAction } = await import('@/lib/ai/quiz-api');
             const quotaResult = await getQuizQuotaAction(params.chunkId);
             if (quotaResult.success && quotaResult.quota) {
                 antrenmanCount = quotaResult.quota.antrenmanCount;
                 arsivCount = quotaResult.quota.arsivCount;
                 denemeCount = quotaResult.quota.denemeCount;
                 console.log(`[QuizGen/TR] 📊 Kota Planı: ${antrenmanCount} Antrenman, ${arsivCount} Arşiv, ${denemeCount} Deneme.`);
             }
          } catch (e) {
              console.error('[QuizGen] Failed to fetch quota:', e);
          }
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        generatedCount: 0,
        totalToGenerate: antrenmanCount, // Only show Antrenman count to user
        queue: [], // Reset queue on new batch
        currentQuestion: null,
        hasStarted: false
      }));
      setLastGenerationParams(params);

      // Track failed requests for retry (Antrenman only)
      const failedIndices: number[] = [];

      // 1. PRE-CHECK: Fetch existing questions from DB
      let questionsToGenerate = antrenmanCount;
      const fetchedQuestions: QuizQuestion[] = [];
      
      if (params.type === 'chunk' && params.userId) {
          try {
              const existing = await fetchQuestionsForSession(params.chunkId, antrenmanCount, params.userId, 'antrenman');
              if (existing.length > 0) {
                  console.log(`[QuizGen] Found ${existing.length} existing questions.`);
                  fetchedQuestions.push(...existing);
                  questionsToGenerate -= existing.length;

                  // Update State with fetched questions immediately
                  setState((prev) => {
                      const isFirst = prev.currentQuestion === null;
                      return {
                          ...prev,
                          currentQuestion: isFirst ? existing[0] : prev.currentQuestion,
                          queue: isFirst ? [...prev.queue, ...existing.slice(1)] : [...prev.queue, ...existing],
                          generatedCount: prev.generatedCount + existing.length,
                          isLoading: questionsToGenerate > 0, // Continue loading if we need more
                      };
                  });
              }
          } catch (e) {
              console.error('[QuizGen] Error fetching existing questions:', e);
          }
      }

      // 2. GENERATE ANTRENMAN (Visible to User) - Only if needed
      for (let i = 0; i < questionsToGenerate; i++) {
        try {
          let result: QuizGenerationResult;
          
          if (params.type === 'chunk') {
            result = await generateQuizQuestion(params.chunkId, { userId: params.userId, usageType: 'antrenman' });
          } else {
            result = await generateQuizQuestionFromContent(
              params.courseName,
              params.sectionTitle,
              params.content,
              params.courseId
            ); // Content-based doesn't support usageType yet fully, defaults to antrenman
          }

          if (result.success && result.question) {
             setState((prev) => {
              const isFirst = prev.currentQuestion === null;
              const newGeneratedCount = prev.generatedCount + 1;
              return {
                ...prev,
                currentQuestion: isFirst ? result.question! : prev.currentQuestion,
                queue: isFirst ? prev.queue : [...prev.queue, result.question!],
                generatedCount: newGeneratedCount,
                error: null,
              };
            });
          } else {
             console.warn(`[QuizGen/TR] ⚠️ Antrenman Soru ${i+1} üretilemedi.`);
             failedIndices.push(i);
          }

          // Rate limit protection
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
           console.error(`[QuizGen/TR] ❌ Hata (Antrenman ${i+1}):`, err);
           failedIndices.push(i);
        }
      }

      // RETRY LOGIC for Antrenman
      if (failedIndices.length > 0) {
          console.log(`[QuizGen/TR] 🔄 Başarısız olan ${failedIndices.length} antrenman sorusu için tekrar deneniyor...`);
          for (const index of failedIndices) {
             try {
                let result: QuizGenerationResult;
                if (params.type === 'chunk') {
                    result = await generateQuizQuestion(params.chunkId, { userId: params.userId, usageType: 'antrenman' });
                } else {
                    result = await generateQuizQuestionFromContent(params.courseName, params.sectionTitle, params.content, params.courseId);
                }

                if (result.success && result.question) {
                     setState((prev) => {
                        const isFirst = prev.currentQuestion === null;
                        const newGeneratedCount = prev.generatedCount + 1;
                        return {
                            ...prev,
                            currentQuestion: isFirst ? result.question! : prev.currentQuestion,
                            queue: isFirst ? prev.queue : [...prev.queue, result.question!],
                            generatedCount: newGeneratedCount,
                            error: null,
                        };
                     });
                     console.log(`[QuizGen/TR] ✅ Antrenman Soru ${index+1} kurtarıldı.`);
                }
             } catch (retryErr) { console.error('Retry failed', retryErr); }
          }
      }

      // Final State Check (Stop Loading UI)
      setState(prev => ({
          ...prev,
          isLoading: false,
          error: prev.generatedCount === 0 ? "Soru üretimi başarısız oldu." : null
      }));

      // 2. BACKGROUND GENERATION (Arsiv & Deneme)
      // Fire and forget - do not await or block UI
      if (params.type === 'chunk' && (arsivCount > 0 || denemeCount > 0)) {
          (async () => {
              console.log(`[QuizGen/TR] 🕵️‍♂️ Arka plan üretimi başlıyor (Arşiv: ${arsivCount}, Deneme: ${denemeCount})...`);
              
              // Generate ARSIV
              for (let i = 0; i < arsivCount; i++) {
                  await generateQuizQuestion(params.chunkId, { userId: params.userId, usageType: 'arsiv' });
              }
              console.log(`[QuizGen/TR] ✅ Arşiv üretimi tamamlandı.`);

              // Generate DENEME
              for (let i = 0; i < denemeCount; i++) {
                  await generateQuizQuestion(params.chunkId, { userId: params.userId, usageType: 'deneme' });
              }
              console.log(`[QuizGen/TR] ✅ Deneme üretimi tamamlandı.`);
          })();
      }

      
      // console.log('Batch generation finished.');
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

  const startQuiz = useCallback(() => {
    setState((prev) => ({ ...prev, hasStarted: true }));
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
    startQuiz,
  };
}
