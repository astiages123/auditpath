import { motion } from 'framer-motion';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { QuizLoadingView, QuizErrorView, QuizProgress } from './QuizStatus';
import { QuizCard } from './QuizCard';
import { QuizFooter } from './QuizFooter';
import { QuizResultsView } from './QuizResultsView';
import type { QuizQuestion, QuizState } from '@/features/quiz/types';

interface QuizViewProps {
  state: QuizState;
  progressIndex: number;
  onConfirm: () => void;
  onBlank: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelect: (index: number) => void;
  onToggleExplanation: () => void;
  onRetry: () => void;
  onClose: () => void;
}

export function QuizView({
  state,
  progressIndex,
  onConfirm,
  onBlank,
  onNext,
  onPrev,
  onSelect,
  onToggleExplanation,
  onRetry,
  onClose,
}: QuizViewProps) {
  // If the summary exists, it means the quiz is finished
  if (state.summary) {
    return (
      <QuizResultsView
        results={{
          correct: state.summary.masteryScore,
          incorrect: state.summary.pendingReview,
          blank: 0,
          totalTimeMs: 0,
        }}
        history={state.history}
        onClose={onClose}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-hidden p-0 min-h-0">
          <div className="max-w-full mx-auto h-full flex flex-col">
            {state.isLoading && (
              <QuizLoadingView
                isLoading={state.isLoading}
                generatedCount={state.generatedCount}
                totalToGenerate={state.totalToGenerate}
              />
            )}
            {state.error && (
              <QuizErrorView error={state.error} onRetry={onRetry} />
            )}
            {!state.isLoading && !state.error && state.hasStarted && (
              <div className="flex flex-col h-full min-h-0">
                <QuizProgress
                  currentReviewIndex={progressIndex}
                  totalQueueLength={state.generatedCount}
                  timerIsRunning={!state.isAnswered && !state.isLoading}
                  currentQuestionId={state.currentQuestion?.id}
                  lastSubmissionResult={state.lastSubmissionResult}
                />
                <div className="flex-1 min-h-0">
                  <QuizCard
                    question={state.currentQuestion}
                    selectedAnswer={state.selectedAnswer}
                    isAnswered={state.isAnswered}
                    isCorrect={state.isCorrect}
                    showExplanation={state.showExplanation}
                    onSelectAnswer={onSelect}
                    onToggleExplanation={onToggleExplanation}
                    onRetry={onRetry}
                    onBlank={onBlank}
                    isLoading={state.isLoading}
                    error={state.error}
                  />
                </div>
                <QuizFooter
                  isAnswered={state.isAnswered}
                  showExplanation={state.showExplanation}
                  selectedAnswer={state.selectedAnswer}
                  isSubmitting={state.isLoading} // Approximated from isLoading
                  onPrev={onPrev}
                  onNext={onNext}
                  onConfirm={onConfirm}
                  onBlank={onBlank}
                  onToggleExplanation={onToggleExplanation}
                  historyLength={state.history.length}
                  progressQueue={state.history
                    .map((h) => (h as QuizQuestion).id)
                    .filter((id): id is string => !!id)
                    .concat(
                      state.currentQuestion && state.currentQuestion.id
                        ? [state.currentQuestion.id]
                        : []
                    )
                    .concat(
                      state.queue
                        .map((q) => q.id)
                        .filter((id): id is string => !!id)
                    )}
                  progressIndex={progressIndex}
                  questionResults={{}} // Simplified for now
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// ============================================================================
// Intermission Screen (formerly IntermissionScreen.tsx)
// ============================================================================

import { CheckCircle2, ArrowRight, Brain } from 'lucide-react';

interface IntermissionScreenProps {
  batchIndex: number;
  totalBatches: number;
  onContinue: () => void;
  correctCount?: number;
  incorrectCount?: number;
}

export function IntermissionScreen({
  batchIndex,
  totalBatches,
  onContinue,
  correctCount = 0,
  incorrectCount = 0,
}: IntermissionScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto text-center py-12 space-y-8"
    >
      <div className="space-y-2">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/30 mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-bold bg-linear-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          {batchIndex + 1}. Set Tamamlandı!
        </h2>
        <p className="text-muted-foreground text-lg">
          Harika gidiyorsun. Sırada {totalBatches - (batchIndex + 1)} set daha
          var.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background/50 border border-emerald-500/20 rounded-xl">
          <div className="text-3xl font-bold text-emerald-500 mb-1">
            {correctCount}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Doğru
          </div>
        </div>
        <div className="p-4 bg-background/50 border border-red-500/20 rounded-xl">
          <div className="text-3xl font-bold text-red-500 mb-1">
            {incorrectCount}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Yanlış
          </div>
        </div>
      </div>

      <div className="bg-muted/10 p-4 rounded-xl text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2 text-foreground font-medium">
          <Brain className="w-4 h-4 text-primary" />
          <span>Bilişsel Mola</span>
        </div>
        <p>Kısa bir nefes al ve hazır olduğunda devam et.</p>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2 group"
      >
        <span>Sıradaki Sete Geç</span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
}

// ============================================================================
// Quiz Container (formerly QuizContainer.tsx)
// ============================================================================

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useQuiz } from '@/features/quiz/hooks/useQuiz';

interface QuizContainerProps {
  chunkId?: string;
  courseId?: string;
  onClose?: () => void;
}

export function QuizContainer({
  chunkId,
  courseId,
  onClose,
}: QuizContainerProps) {
  const { user } = useAuth();
  const {
    state,
    progressIndex,
    startQuiz,
    selectAnswer,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    toggleExplanation,
  } = useQuiz();

  useEffect(() => {
    if (user?.id && courseId) {
      startQuiz(user.id, courseId, chunkId);
    }
  }, [user?.id, courseId, chunkId, startQuiz]);

  return (
    <QuizView
      state={state}
      progressIndex={progressIndex}
      onConfirm={() => submitAnswer('correct')}
      onBlank={() => submitAnswer('blank')}
      onNext={nextQuestion}
      onPrev={previousQuestion}
      onSelect={selectAnswer}
      onToggleExplanation={toggleExplanation}
      onRetry={() =>
        user?.id && courseId && startQuiz(user.id, courseId, chunkId)
      }
      onClose={onClose || (() => {})}
    />
  );
}
