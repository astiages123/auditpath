/**
 * QuizEngine Component
 *
 * Main orchestrator for the quiz flow using specialized hooks.
 */

import {
  useCallback,
  useState,
  useEffect,
  useRef,
  useTransition,
  useMemo,
} from 'react';
import { useQuiz } from '@/features/quiz/hooks/useQuiz';
import { QuizCard } from './QuizCard';
import { useQuizSession } from '@/features/quiz/context/QuizSessionContext';
import { checkAndTriggerBackgroundGeneration } from '@/features/quiz/logic/engines/backgroundEngine';
import { type QuizQuestion } from '@/features/quiz/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PostTestDashboard } from '../outcomes/PostTestDashboard';
import { IntermissionScreen } from '../outcomes/IntermissionScreen';
import { calculateTestResults } from '@/features/quiz/logic/algorithms/scoring';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { QuizLoadingView, QuizErrorView } from './QuizStatusViews';
import { QuizSessionStats } from './QuizSessionStats';
import { QuizFooter } from './QuizFooter';

// Internal Hooks
import { useBatchInitialization } from './quiz-view/useBatchInitialization';

interface QuizEngineProps {
  chunkId?: string;
  courseName?: string;
  sectionTitle?: string;
  content?: string;
  initialQuestions?: QuizQuestion[];
  onNextQuestion?: () => void;
  onClose?: () => void;
  courseId?: string;
  useMock?: boolean;
}

export function QuizView({
  chunkId,
  courseName,
  initialQuestions,
  onClose,
  courseId,
  useMock,
}: QuizEngineProps) {
  const { user } = useAuth();
  const {
    initializeSession,
    recordResponse,
    state: sessionState,
    advanceBatch,
  } = useQuizSession();

  const {
    state,
    results,
    generateBatch,
    loadQuestions,
    nextQuestion,
    previousQuestion,
    selectAnswer,
    confirmAnswer,
    toggleExplanation,
    retry,
    startQuiz,
    markAsBlank,
  } = useQuiz({
    recordResponse: async (qId, type, answer, time) => {
      return recordResponse(qId, chunkId || null, type, answer, time);
    },
  });

  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionResults, setQuestionResults] = useState<
    Record<string, 'correct' | 'incorrect' | 'blank'>
  >({});
  const [fullBatchIds, setFullBatchIds] = useState<string[]>([]);
  const batchStartResultsRef = useRef({ correct: 0, incorrect: 0, blank: 0 });
  const [isPending, startTransition] = useTransition();
  const incorrectIdsRef = useRef<string[]>([]);
  const currentMasteryRef = useRef<number | undefined>(undefined);

  // Initialize Session and Loading Logic
  useBatchInitialization({
    chunkId,
    courseId,
    user,
    useMock,
    initialQuestions,
    sessionState,
    quizState: state,
    initializeSession,
    loadQuestions,
    generateBatch,
    setFullBatchIds,
  });

  useEffect(() => {
    if (state.lastSubmissionResult?.newMastery !== undefined) {
      currentMasteryRef.current = state.lastSubmissionResult.newMastery;
    }
  }, [state.lastSubmissionResult]);

  const handleConfirm = useCallback(async () => {
    if (isSubmitting || !user?.id || !courseId || !state.currentQuestion)
      return;
    setIsSubmitting(true);
    try {
      const isCorrect = state.selectedAnswer === state.currentQuestion.a;
      if (!isCorrect && state.currentQuestion?.id) {
        incorrectIdsRef.current.push(state.currentQuestion.id);
      }
      const qId = state.currentQuestion.id;
      if (qId) {
        setQuestionResults((prev) => ({
          ...prev,
          [qId]: isCorrect ? 'correct' : 'incorrect',
        }));
      }
      await confirmAnswer(user.id, courseId);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    confirmAnswer,
    state.selectedAnswer,
    state.currentQuestion,
    user?.id,
    isSubmitting,
    courseId,
  ]);

  const handleBlank = useCallback(async () => {
    const qId = state.currentQuestion?.id;
    if (qId) {
      setQuestionResults((prev) => ({ ...prev, [qId]: 'blank' }));
    }
    markAsBlank();
  }, [markAsBlank, state.currentQuestion]);

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

  useEffect(() => {
    if (
      !state.isLoading &&
      !state.hasStarted &&
      sessionState.status !== 'IDLE' &&
      sessionState.status !== 'INITIALIZING' &&
      !sessionState.error &&
      state.queue.length > 0
    ) {
      startQuiz();
    }
  }, [
    state.isLoading,
    state.hasStarted,
    sessionState.status,
    sessionState.error,
    state.queue.length,
    startQuiz,
  ]);

  const progressData = useMemo(() => {
    const isReview = sessionState.reviewQueue.length > 0;
    interface ReviewQueueItem {
      questionId: string;
    }
    const progressQueue = isReview
      ? sessionState.reviewQueue.map((item: ReviewQueueItem) => item.questionId)
      : state.currentQuestion
        ? [
            state.currentQuestion.id || 'curr',
            ...state.queue.map((q) => q.id || 'next'),
          ]
        : state.queue.map((q) => q.id || 'next');

    const progressIndex = isReview
      ? sessionState.currentReviewIndex
      : state.generatedCount -
        state.queue.length -
        (state.currentQuestion ? 1 : 0);

    const footerProgressIndex =
      useMock || !isReview
        ? state.totalToGenerate -
          state.queue.length -
          (state.currentQuestion ? 1 : 0)
        : sessionState.currentReviewIndex;

    return { progressQueue, progressIndex, footerProgressIndex };
  }, [
    sessionState.reviewQueue,
    sessionState.currentReviewIndex,
    state.currentQuestion,
    state.queue,
    state.generatedCount,
    state.totalToGenerate,
    useMock,
  ]);

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
          onContinue={() => {
            batchStartResultsRef.current = {
              correct: results.correct,
              incorrect: results.incorrect,
              blank: results.blank,
            };
            startTransition(() => {
              setIsFinished(false);
              advanceBatch();
            });
          }}
          correctCount={results.correct - batchStartResultsRef.current.correct}
          incorrectCount={
            results.incorrect - batchStartResultsRef.current.incorrect
          }
        />
      );
    }
    return (
      <PostTestDashboard
        results={calculateTestResults(
          results.correct,
          results.incorrect,
          results.blank,
          results.totalTimeMs
        )}
        history={state.history}
        courseName={courseName}
        onClose={() => onClose?.()}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-hidden p-0 min-h-0">
          <div className="max-w-full mx-auto h-full flex flex-col">
            {(state.isLoading ||
              ((sessionState.status === 'IDLE' ||
                sessionState.status === 'INITIALIZING') &&
                !sessionState.error)) && (
              <QuizLoadingView
                isLoading={state.isLoading}
                generatedCount={state.generatedCount}
                totalToGenerate={state.totalToGenerate}
              />
            )}
            {sessionState.error && (
              <QuizErrorView
                error={sessionState.error}
                onRetry={() => courseId && initializeSession(courseId)}
              />
            )}
            {!state.isLoading &&
              sessionState.status !== 'IDLE' &&
              sessionState.status !== 'INITIALIZING' &&
              !sessionState.error &&
              state.hasStarted && (
                <div
                  className="flex flex-col h-full min-h-0"
                  style={{
                    opacity: isPending ? 0.85 : 1,
                    transition: 'opacity 150ms ease-in-out',
                  }}
                >
                  <QuizSessionStats
                    courseStats={
                      useMock && !sessionState.courseStats
                        ? { totalQuestionsSolved: 156, averageMastery: 82 }
                        : sessionState.courseStats
                    }
                    currentReviewIndex={progressData.progressIndex}
                    totalQueueLength={progressData.progressQueue.length}
                    timerIsRunning={!state.isAnswered && !state.isLoading}
                    currentQuestionId={state.currentQuestion?.id}
                    currentMastery={currentMasteryRef.current}
                    lastSubmissionResult={state.lastSubmissionResult}
                  />
                  <div className="flex-1 min-h-0">
                    <QuizCard
                      question={state.currentQuestion}
                      selectedAnswer={state.selectedAnswer}
                      isAnswered={state.isAnswered}
                      isCorrect={state.isCorrect}
                      showExplanation={state.showExplanation}
                      isLoading={false}
                      error={state.error}
                      onSelectAnswer={selectAnswer}
                      onToggleExplanation={toggleExplanation}
                      onRetry={retry}
                      onBlank={handleBlank}
                    />
                  </div>
                  <QuizFooter
                    isAnswered={state.isAnswered}
                    showExplanation={state.showExplanation}
                    selectedAnswer={state.selectedAnswer}
                    isSubmitting={isSubmitting}
                    historyLength={state.history.length}
                    onPrev={previousQuestion}
                    onNext={handleNext}
                    onConfirm={handleConfirm}
                    onBlank={handleBlank}
                    onToggleExplanation={toggleExplanation}
                    progressQueue={
                      useMock && fullBatchIds.length > 0
                        ? fullBatchIds
                        : progressData.progressQueue
                    }
                    progressIndex={progressData.footerProgressIndex}
                    questionResults={questionResults}
                  />
                </div>
              )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default QuizView;
