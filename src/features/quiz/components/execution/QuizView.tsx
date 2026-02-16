/**
 * QuizEngine Component
 *
 * Main orchestrator for the quiz flow:
 * - Handles question generation triggers
 * - Manages quiz state via useQuiz hook
 * - Provides navigation and control buttons
 */

import { useCallback, useState, useEffect, useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { useQuiz } from '@/features/quiz/hooks/useQuiz';
import { QuizCard } from './QuizCard';
import { useQuizSession } from '@/features/quiz/context/quizSessionContext';
import { checkAndTriggerBackgroundGeneration } from '@/features/quiz/logic';
import { type QuizQuestion } from '@/features/quiz/types';
import { refreshArchivedQuestions } from '@/features/quiz/logic';
import * as Repository from '@/features/quiz/services/repositories/quizRepository';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PostTestDashboard } from '../outcomes/PostTestDashboard';
import { IntermissionScreen } from '../outcomes/IntermissionScreen';
import { calculateTestResults } from '@/features/quiz/logic';
import { parseOrThrow } from '@/utils/helpers';
import { QuizQuestionSchema } from '@/features/quiz/types';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import {
  QuizLoadingView,
  QuizReadyView,
  QuizErrorView,
} from './QuizStatusViews';
import { QuizSessionStats } from './QuizSessionStats';
import { AlertCircle } from 'lucide-react';

// Modular Components
import { QuizActionFooter } from './view/QuizActionFooter';

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

export function QuizView({
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
  } = useQuizSession();

  const isSessionInitialized =
    sessionState.status !== 'IDLE' && sessionState.status !== 'INITIALIZING';

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
    recordResponse: async (qId, type, answer, time) => {
      return recordResponse(qId, chunkId || null, type, answer, time);
    },
  });

  const [count] = useState<number>(5);
  const hasStartedAutoRef = useRef(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track batch-specific results to avoid accumulation across batches
  const batchStartResultsRef = useRef({ correct: 0, incorrect: 0, blank: 0 });

  // React 19 Concurrent Features: useTransition for smooth question transitions
  const [isPending, startTransition] = useTransition();

  // Track incorrect questions for follow-up generation
  const incorrectIdsRef = useRef<string[]>([]);
  const previousMasteryRef = useRef<number | null>(null);

  // Update previousMastery baseline when question changes or global stats update
  useEffect(() => {
    if (!state.isAnswered && sessionState.courseStats) {
      previousMasteryRef.current = sessionState.courseStats.averageMastery;
    }
  }, [state.isAnswered, sessionState.courseStats]);

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

  const fetchQuestionsByIds = async (ids: string[]) => {
    if (ids.length === 0) return [];
    const data = await Repository.fetchQuestionsByIds(ids);

    return data.map((q) => {
      const question = parseOrThrow(QuizQuestionSchema, q.question_data);
      question.id = q.id;
      return question;
    });
  };

  // Load initial questions or current batch
  useEffect(() => {
    let active = true;

    async function loadBatch() {
      if (isSessionInitialized && sessionState.batches.length > 0) {
        const currentBatchItems =
          sessionState.batches[sessionState.currentBatchIndex];
        if (!currentBatchItems || currentBatchItems.length === 0) return;

        try {
          const isRefeshing = currentBatchItems.some(
            (i) => i.status === 'archived'
          );
          if (isRefeshing) {
            toast.loading('Ezber bozan taze sorular hazırlanıyor...', {
              id: 'archive-refresh',
            });
          }

          const finalIds = await refreshArchivedQuestions(
            currentBatchItems,
            chunkId || null
          );

          toast.dismiss('archive-refresh');

          if (isRefeshing) {
            toast.success('Arşiv taraması tamamlandı!');
          }

          const questions = await fetchQuestionsByIds(finalIds);
          if (active) {
            const sortedQuestions = finalIds
              .map((id: string) => questions.find((q) => q.id === id))
              .filter(Boolean) as QuizQuestion[];

            if (sortedQuestions.length > 0) {
              loadQuestions(sortedQuestions);
            }
          }
        } catch (e) {
          logger.error('Failed to load batch', e as Error);
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
    isSessionInitialized,
    sessionState.batches,
    sessionState.currentBatchIndex,
    chunkId,
  ]);

  const handleSelectAnswer = useCallback(
    async (index: number) => {
      if (state.isAnswered || !state.currentQuestion) return;

      selectAnswer(index);

      const isCorrect = index === state.currentQuestion.a;

      if (!isCorrect && state.currentQuestion?.id) {
        incorrectIdsRef.current.push(state.currentQuestion.id);

        toast.info(
          'Bu hata analiz edildi ve waterfall mantığıyla sonraki tekrar seanslarına (SRS) enjekte edildi. Lütfen konunun bu kısmını tekrar gözden geçir.',
          {
            duration: 5000,
            icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
          }
        );
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
      await startTransition(async () => {
        await nextQuestion(user.id, courseId);
      });
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
    batchStartResultsRef.current = {
      correct: results.correct,
      incorrect: results.incorrect,
      blank: results.blank,
    };

    startTransition(() => {
      setIsFinished(false);
      advanceBatch();
    });
  };

  if (isFinished) {
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
          correctCount={results.correct - batchStartResultsRef.current.correct}
          incorrectCount={
            results.incorrect - batchStartResultsRef.current.incorrect
          }
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
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full space-y-6">
        {/* Loading State with Progress */}
        {(state.isLoading ||
          (!isSessionInitialized && !sessionState.error)) && (
          <QuizLoadingView
            isLoading={state.isLoading}
            generatedCount={state.generatedCount}
            totalToGenerate={state.totalToGenerate}
          />
        )}

        {/* Ready to Start State */}
        {!state.isLoading &&
          !state.hasStarted &&
          isSessionInitialized &&
          !sessionState.error &&
          state.queue.length > 0 && (
            <QuizReadyView
              onStart={handleStart}
              currentBatchIndex={sessionState.currentBatchIndex}
              totalBatches={sessionState.totalBatches}
              generatedCount={state.generatedCount}
            />
          )}

        {/* Session Error */}
        {sessionState.error && (
          <QuizErrorView
            error={sessionState.error}
            onRetry={() => courseId && initializeSession(courseId)}
          />
        )}

        {/* Quiz Card - SHOW ONLY IF STARTED */}
        {!state.isLoading &&
          isSessionInitialized &&
          !sessionState.error &&
          state.hasStarted && (
            <div
              className="space-y-6"
              style={{
                opacity: isPending ? 0.85 : 1,
                transition: 'opacity 150ms ease-in-out',
              }}
            >
              {/* Stats Header */}
              <QuizSessionStats
                courseStats={sessionState.courseStats}
                currentReviewIndex={sessionState.currentReviewIndex}
                totalQueueLength={sessionState.reviewQueue?.length ?? 0}
                timerIsRunning={!state.isAnswered && !state.isLoading}
                currentQuestionId={state.currentQuestion?.id}
              />

              <QuizCard
                question={state.currentQuestion}
                selectedAnswer={state.selectedAnswer}
                isAnswered={state.isAnswered}
                isCorrect={state.isCorrect}
                showExplanation={state.showExplanation}
                isLoading={false}
                error={state.error}
                onSelectAnswer={handleSelectAnswer}
                onToggleExplanation={toggleExplanation}
                onRetry={retry}
                onBlank={handleBlank}
                courseId={courseId}
              />

              <QuizActionFooter
                isAnswered={state.isAnswered}
                isSubmitting={isSubmitting}
                queueLength={state.queue.length}
                currentBatchIndex={sessionState.currentBatchIndex}
                totalBatches={sessionState.totalBatches}
                lastSubmissionResult={state.lastSubmissionResult}
                previousMastery={previousMasteryRef.current}
                onNext={handleNext}
              />
            </div>
          )}
      </div>
    </ErrorBoundary>
  );
}

export default QuizView;
