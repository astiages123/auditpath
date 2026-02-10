/**
 * QuizEngine Component
 *
 * Main orchestrator for the quiz flow:
 * - Handles question generation triggers
 * - Manages quiz state via useQuiz hook
 * - Provides navigation and control buttons
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  ArrowRight,
  Loader2,
  TrendingUp,
  PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuiz } from '../../hooks/use-quiz';
import { QuizCard } from '../ui/QuizCard';
import { useQuizSession } from '../contexts/QuizSessionContext';
import { checkAndTriggerBackgroundGeneration } from '../../core/engine';
import { type QuizQuestion } from '../../core/types';
import { processBatchForUI } from '@/features/quiz/core/engine';
import * as Repository from '@/features/quiz/api/repository';
import { QuizTimer } from '../ui/QuizTimer';
import { useAuth } from '@/features/auth';
import { PostTestDashboard } from './PostTestDashboard';
import { IntermissionScreen } from './IntermissionScreen';
import { calculateTestResults } from '@/features/quiz/algoritma/scoring';

interface QuizEngineProps {
  /** Note chunk ID for generating questions */
  chunkId?: string;
  /** Direct content for generating questions (alternative to chunkId) */
  courseName?: string;
  sectionTitle?: string;
  content?: string;
  /** Pre-loaded questions to solve */
  initialQuestions?: QuizQuestion[];
  /** Called when user wants to generate another question */
  onNextQuestion?: () => void;
  /** Called when user wants to close the quiz */
  onClose?: () => void;
  /** Course ID for session management */
  courseId?: string;
}

export function QuizEngine({
  chunkId,
  courseName,
  sectionTitle,
  content,
  initialQuestions,
  onClose,
  courseId,
}: QuizEngineProps) {
  const { user } = useAuth();
  const {
    initializeSession,
    recordResponse,
    state: sessionState,
    advanceBatch,
  } = useQuizSession(); // Added advanceBatch

  // Connect SolveQuizService to useQuizSession's recordResponse
  const {
    state,
    results,
    generateBatch,
    loadQuestions,
    nextQuestion,
    selectAnswer,
    toggleExplanation,
    retry,
    startQuiz,
    markAsBlank,
  } = useQuiz({
    recordResponse: async (qId, type, answer, time, diag, ins) => {
      return recordResponse(
        qId,
        chunkId || null,
        type,
        answer,
        time,
        diag,
        ins
      );
    },
  });

  const [count] = useState<number>(5);
  const hasStartedAutoRef = useRef(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track incorrect questions for follow-up generation
  const incorrectIdsRef = useRef<string[]>([]);
  const previousMasteryRef = useRef<number | null>(null);

  // Update previousMastery baseline when question changes or global stats update
  useEffect(() => {
    if (!state.isAnswered && sessionState.courseStats) {
      previousMasteryRef.current = sessionState.courseStats.averageMastery;
    }
  }, [state.isAnswered, sessionState.courseStats?.averageMastery]);

  // Initial mastery baseline fallback
  useEffect(() => {
    if (
      chunkId &&
      user?.id &&
      previousMasteryRef.current === null &&
      !sessionState.courseStats
    ) {
      Repository.getChunkMastery(user.id, chunkId).then((data) => {
        if (data) {
          previousMasteryRef.current = data.mastery_score;
        } else {
          previousMasteryRef.current = 0;
        }
      });
    }
  }, [chunkId, user?.id, sessionState.courseStats]);

  // Connect recordResponse to the hook/service via useEffect
  // For now, let's keep it manual in handleSelectAnswer and handleBlank if service doesn't have it.
  // Wait, I added recordResponse to service callbacks! I just need to pass it in useQuiz.

  // Initialize Session
  useEffect(() => {
    if (courseId) {
      initializeSession(courseId);
    }
  }, [courseId, initializeSession]);

  const handleGenerate = useCallback(() => {
    if (chunkId && user?.id) {
      generateBatch(count, { type: 'chunk', chunkId, userId: user.id });
    }
  }, [chunkId, generateBatch, count, user?.id]);

  // Auto-start generation
  useEffect(() => {
    if (
      !hasStartedAutoRef.current &&
      !state.currentQuestion &&
      !state.isLoading &&
      !state.error &&
      !initialQuestions?.length
    ) {
      if (chunkId || (courseName && sectionTitle && content)) {
        hasStartedAutoRef.current = true;
        handleGenerate();
      }
    }
  }, [
    state.currentQuestion,
    state.isLoading,
    state.error,
    chunkId,
    courseName,
    sectionTitle,
    content,
    initialQuestions,
    handleGenerate,
  ]);

  // Helper to fetch questions by IDs (mocking import for now, or direct supabase call)
  // Ideally this should be in api/solve-quiz.api.ts
  // For now, let's implement a local fetcher using the same pattern as fetchQuestionsForSession
  const fetchQuestionsByIds = async (ids: string[]) => {
    if (ids.length === 0) return [];
    const data = await Repository.fetchQuestionsByIds(ids);

    return data.map((q) => {
      const question = q.question_data as unknown as QuizQuestion;
      question.id = q.id;
      return question;
    });
  };

  // Load initial questions or current batch
  useEffect(() => {
    let active = true;

    async function loadBatch() {
      if (sessionState.isInitialized && sessionState.batches.length > 0) {
        // Get current batch items
        const currentBatchItems =
          sessionState.batches[sessionState.currentBatchIndex];
        if (!currentBatchItems || currentBatchItems.length === 0) return;

        // Check if we already loaded these?
        // QuizEngine state doesn't track "batch index".
        // We can check if state.queue matches.

        try {
          // ANTI-EZBER & SRS INTERCEPTION
          const currentBatchItems =
            sessionState.batches[sessionState.currentBatchIndex];

          // Show global loader if we are refreshing
          const isRefeshing = currentBatchItems.some(
            (i) => i.status === 'archived'
          );
          if (isRefeshing) {
            toast.loading('Ezber bozan taze sorular hazırlanıyor...', {
              id: 'archive-refresh',
            });
          }

          const finalIds = await processBatchForUI(
            currentBatchItems,
            chunkId || null
            // Optional: Provide a callback if engine supports progress reporting
          );

          toast.dismiss('archive-refresh');

          if (isRefeshing) {
            toast.success('Arşiv taraması tamamlandı!');
          }

          const questions = await fetchQuestionsByIds(finalIds);
          if (active) {
            // Sort questions to match the batch order (Priority)
            // Note: We need to map back carefully because we changed IDs.
            // The order of 'finalIds' matches 'currentBatchItems'.

            const sortedQuestions = finalIds
              .map((id) => questions.find((q) => q.id === id))
              .filter(Boolean) as QuizQuestion[];

            if (sortedQuestions.length > 0) {
              loadQuestions(sortedQuestions);
              // toast.info(`${sessionState.currentBatchIndex + 1}. Set Yüklendi`);
            }
          }
        } catch (e) {
          console.error('Failed to load batch', e);
          toast.dismiss('archive-refresh');
          toast.error('Sorular yüklenirken hata oluştu.');
        }
      }
    }

    if (initialQuestions && initialQuestions.length > 0) {
      loadQuestions(initialQuestions);
    } else {
      loadBatch();
    }

    return () => {
      active = false;
    };
  }, [
    initialQuestions,
    loadQuestions,
    sessionState.isInitialized,
    sessionState.batches,
    sessionState.currentBatchIndex,
    chunkId,
  ]);

  const handleSelectAnswer = useCallback(
    async (index: number) => {
      if (state.isAnswered || !state.currentQuestion) return;

      // 1. Process via service/hook
      selectAnswer(index);

      const isCorrect = index === state.currentQuestion.a;

      // 2. Local side effects
      if (!isCorrect && state.currentQuestion?.id) {
        incorrectIdsRef.current.push(state.currentQuestion.id);
      }
    },
    [selectAnswer, state]
  );

  const handleBlank = useCallback(async () => {
    markAsBlank();
  }, [markAsBlank]);

  const handleNext = useCallback(async () => {
    if (isSubmitting || !user?.id || !courseId) return;
    setIsSubmitting(true);
    try {
      await nextQuestion(user.id, courseId);
    } finally {
      setIsSubmitting(false);
    }
  }, [nextQuestion, user?.id, courseId, isSubmitting]);

  // Check for finish
  useEffect(() => {
    if (
      state.hasStarted &&
      !state.isLoading &&
      !state.currentQuestion &&
      state.queue.length === 0 &&
      state.generatedCount > 0
    ) {
      setIsFinished(true);
      if (chunkId && user?.id) {
        checkAndTriggerBackgroundGeneration(chunkId, incorrectIdsRef.current);
      }
    }
  }, [state, chunkId, user?.id]);

  const handleStart = useCallback(() => {
    startQuiz();
  }, [startQuiz]);

  const handleIntermissionContinue = () => {
    setIsFinished(false);
    advanceBatch();
  };

  // If finished
  if (isFinished) {
    // Check if we have more batches
    const hasMoreBatches =
      sessionState.currentBatchIndex < sessionState.totalBatches - 1;

    if (hasMoreBatches) {
      return (
        <IntermissionScreen
          batchIndex={sessionState.currentBatchIndex}
          totalBatches={sessionState.totalBatches}
          completedBatchQuestions={
            sessionState.batches[sessionState.currentBatchIndex] || []
          }
          onContinue={handleIntermissionContinue}
          correctCount={results.correct} // Note: This is cumulative for the session if we don't reset 'results' in hook.
          incorrectCount={results.incorrect}
          // TODO: 'results' from useQuiz accumulates.
          // Either we reset it on batch advance, or we track batch-specific stats.
          // For now, let's show cumulative or just hide exact numbers if confusing.
          // Or better: Show "Bu sette X doğru" by storing prev totals?
          // Let's keep it simple: Show cumulative is fine, or just "Completion".
          // Design requested: "özetleyen".
          // Let's assume cumulative is acceptable or we'd need to snapshot.
        />
      );
    }

    const summaryStats = calculateTestResults(
      results.correct,
      results.incorrect,
      results.blank,
      results.totalTimeMs
    );

    return (
      <PostTestDashboard
        results={summaryStats}
        courseName={courseName}
        onClose={() => {
          onClose?.();
          // Optionally reset local state if needed, but component unmounts usually
        }}
      />
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Start Button & Controls - REMOVED for auto-start flow */}

      {/* Loading State with Progress */}
      {(state.isLoading ||
        (!sessionState.isInitialized && !sessionState.error)) && (
        <div className="text-center py-12 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-white">
              {state.isLoading
                ? 'Sorular Hazırlanıyor...'
                : 'Oturum Hazırlanıyor...'}
            </h3>
            {state.isLoading && state.totalToGenerate > 0 && (
              <p className="text-muted-foreground">
                {state.generatedCount} / {state.totalToGenerate} tamamlanıyor
              </p>
            )}
          </div>
        </div>
      )}

      {/* Ready to Start State */}
      {!state.isLoading &&
        !state.hasStarted &&
        sessionState.isInitialized &&
        !sessionState.error &&
        state.queue.length > 0 && ( // Also check if we have questions
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 space-y-6"
          >
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto ring-1 ring-primary/50">
              <ArrowRight className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Hazır mısın?</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {/* Show Total Session Count, not just batch */}
                {sessionState.totalBatches > 1
                  ? `${sessionState.currentBatchIndex + 1}. Set başlıyor. (${state.generatedCount} Soru)`
                  : `${state.generatedCount} adet antrenman sorusu hazırlandı.`}
              </p>
            </div>
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25"
            >
              Antrenmanı Başlat
            </button>
          </motion.div>
        )}

      {/* Session Error */}
      {sessionState.error && (
        <div className="text-center py-12 space-y-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6 text-red-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-red-500">Oturum Hatası</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {sessionState.error}
            </p>
            <button
              onClick={() => courseId && initializeSession(courseId)}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      )}

      {/* Quiz Card - SHOW ONLY IF STARTED */}
      {!state.isLoading &&
        sessionState.isInitialized &&
        !sessionState.error &&
        state.hasStarted && (
          <div className="space-y-6">
            {/* Stats Header */}
            {sessionState.courseStats && (
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Toplam Çözülen
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {sessionState.courseStats.totalQuestionsSolved} Soru
                    </span>
                  </div>
                  <div className="w-px h-8 bg-border/50" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Ortalama Başarı
                    </span>
                    <span className="text-lg font-bold text-emerald-500">
                      %{sessionState.courseStats.averageMastery}
                    </span>
                  </div>
                </div>
                {/* Session Progress */}
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Oturum
                  </span>
                  <div className="text-sm font-medium">
                    {/* Global Progress: currentReviewIndex (0-based) + 1 / Total Queue Length */}
                    Soru {sessionState.currentReviewIndex + 1} /{' '}
                    {sessionState.reviewQueue.length}
                  </div>
                  <QuizTimer
                    key={state.currentQuestion?.id ?? 'timer'}
                    isRunning={!state.isAnswered && !state.isLoading}
                  />
                </div>
              </div>
            )}

            <QuizCard
              question={state.currentQuestion}
              selectedAnswer={state.selectedAnswer}
              isAnswered={state.isAnswered}
              isCorrect={state.isCorrect}
              showExplanation={state.showExplanation}
              isLoading={false} // Handled above
              error={state.error}
              onSelectAnswer={handleSelectAnswer}
              onToggleExplanation={toggleExplanation}
              onRetry={retry}
              onBlank={handleBlank}
              courseId={courseId}
            />
          </div>
        )}

      {/* Action Buttons & Feedback - shown after answering */}
      {state.isAnswered && (
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <AnimatePresence>
            {state.lastSubmissionResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-2xl p-5 shadow-xl relative overflow-hidden group"
              >
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-primary/10" />

                <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
                  <div className="p-3 bg-primary/10 rounded-xl ring-1 ring-primary/30">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-3 gap-y-1">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        İlerleme Güncellendi
                      </h4>
                      {state.lastSubmissionResult.scoreDelta > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full border border-emerald-500/20">
                          +{state.lastSubmissionResult.scoreDelta} Puan
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-baseline gap-2 justify-center sm:justify-start">
                      <p className="text-xl font-bold text-white">
                        Uzmanlık Artışı:
                      </p>
                      <span className="text-2xl font-black text-primary">
                        +%
                        {state.lastSubmissionResult.newMastery -
                          (previousMasteryRef.current ??
                            state.lastSubmissionResult.newMastery)}
                      </span>
                    </div>

                    {state.lastSubmissionResult.isTopicRefreshed && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-2 flex items-center gap-2 text-emerald-400 font-medium"
                      >
                        <PartyPopper className="w-4 h-4" />
                        <span className="text-sm">
                          Tebrikler! Bu konuyu pekiştirdin.
                        </span>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex flex-col items-center sm:items-end">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter mb-1">
                      Yeni Seviye
                    </span>
                    <div className="text-3xl font-black text-white bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                      %{state.lastSubmissionResult.newMastery}
                    </div>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-primary/30 w-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${state.lastSubmissionResult.newMastery}%`,
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-primary"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-primary-foreground rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-primary/25 ${
                isSubmitting
                  ? 'bg-primary/70 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
              {isSubmitting
                ? 'İşleniyor...'
                : state.queue.length > 0
                  ? `Sıradaki Soru (${state.queue.length})`
                  : sessionState.currentBatchIndex <
                      sessionState.totalBatches - 1
                    ? 'Sonraki Set'
                    : 'Testi Bitir'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default QuizEngine;
