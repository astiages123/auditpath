// Removed unused imports
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
                <ErrorBoundary
                  fallback={
                    <div className="p-4 text-red-500 text-center text-sm border border-red-500/20 rounded-lg m-4">
                      İlerleme durumu yüklenemedi.
                    </div>
                  }
                >
                  <QuizProgress
                    currentReviewIndex={progressIndex}
                    totalQueueLength={state.generatedCount}
                    timerIsRunning={!state.isAnswered && !state.isLoading}
                    currentQuestionId={state.currentQuestion?.id}
                    lastSubmissionResult={state.lastSubmissionResult}
                  />
                </ErrorBoundary>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ErrorBoundary
                    fallback={
                      <div className="p-8 text-red-500 text-center text-sm border border-red-500/20 rounded-lg h-full flex flex-col items-center justify-center m-4">
                        Soru içeriği yüklenirken bir hata oluştu. Sonraki soruya
                        geçmeyi deneyin.
                      </div>
                    }
                  >
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
                  </ErrorBoundary>
                </div>
                <ErrorBoundary
                  fallback={
                    <div className="p-4 bg-red-500/10 text-red-500 text-center text-sm font-medium">
                      Platform kontrolleri yüklenemedi.
                    </div>
                  }
                >
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
                </ErrorBoundary>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// Components extracted to IntermissionScreen.tsx and QuizContainer.tsx
