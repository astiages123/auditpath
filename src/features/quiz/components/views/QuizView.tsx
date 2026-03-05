import { ErrorBoundary } from '@/components/ui/error-boundary';
import {
  QuizLoadingView,
  QuizErrorView,
  QuizProgress,
} from '@/features/quiz/components/content/QuizStatus';
import { QuizCard } from '@/features/quiz/components/content/QuizCard';
import { QuizFooter } from '@/features/quiz/components/layout/QuizFooter';
import { QuizResultsView } from '@/features/quiz/components/views/QuizResultsView';
import type { QuizResults, QuizState } from '@/features/quiz/types';

const getCurrentQuestionResult = (
  state: QuizState
): 'correct' | 'incorrect' | 'blank' | null => {
  if (!state.isAnswered || !state.currentQuestion) {
    return null;
  }

  const currentQuestion =
    state.currentQuestion as QuizState['currentQuestion'] & {
      responseType?: 'correct' | 'incorrect' | 'blank';
    };

  if (currentQuestion.responseType) {
    return currentQuestion.responseType;
  }

  return state.isCorrect === true
    ? 'correct'
    : state.selectedAnswer === null
      ? 'blank'
      : 'incorrect';
};

const buildQuestionResults = (state: QuizState) => {
  const questionResults: Record<string, 'correct' | 'incorrect' | 'blank'> = {};

  state.history.forEach((item) => {
    if (item.id) {
      questionResults[item.id] = item.responseType;
    }
  });

  const currentQuestionResult = getCurrentQuestionResult(state);
  if (currentQuestionResult && state.currentQuestion?.id) {
    questionResults[state.currentQuestion.id] = currentQuestionResult;
  }

  return questionResults;
};

// === TYPES ===

interface QuizViewProps {
  /** Mevcut quiz durumu */
  state: QuizState;
  /** Biriken gerçek sonuç sayıları */
  results: QuizResults;
  /** İlerleme indeksi */
  progressIndex: number;
  /** Onay handler */
  onConfirm: () => void;
  /** Boş bırak handler */
  onBlank: () => void;
  /** Sonraki soru handler */
  onNext: () => void;
  /** Önceki soru handler */
  onPrev: () => void;
  /** Seçenek seçme handler */
  onSelect: (index: number) => void;
  /** Açıklama göster/gizle handler */
  onToggleExplanation: () => void;
  /** Yeniden dene handler */
  onRetry: () => void;
  /** Kapatma handler */
  onClose: () => void;
}

/**
 * Quiz arayüzünün (progress, card, footer) birleşimini yöneten ana görünüm bileşeni.
 */
export function QuizView({
  state,
  results,
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
  // === RENDER LOGIC ===
  const questionResults = buildQuestionResults(state);
  const progressQueue = Array.from(
    new Set(
      state.history
        .map((h) => h.id)
        .filter((id): id is string => !!id)
        .concat(state.currentQuestion?.id ? [state.currentQuestion.id] : [])
        .concat(state.queue.map((q) => q.id).filter((id): id is string => !!id))
    )
  );

  // Sınav bittiyse sonuç ekranını göster
  if (state.summary) {
    return (
      <QuizResultsView
        results={results}
        history={state.history}
        onClose={onClose}
      />
    );
  }

  // === RENDER ===
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-hidden p-0 min-h-0">
          <div className="max-w-full mx-auto h-full flex flex-col">
            {/* Yükleme Ekranı */}
            {state.isLoading && (
              <QuizLoadingView
                isLoading={state.isLoading}
                generatedCount={state.generatedCount}
                totalToGenerate={state.totalToGenerate}
              />
            )}

            {/* Hata Ekranı */}
            {state.error && (
              <QuizErrorView error={state.error} onRetry={onRetry} />
            )}

            {/* Aktif Quiz Alanı */}
            {!state.isLoading && !state.error && state.hasStarted && (
              <div className="flex flex-col h-full min-h-0">
                {/* İlerleme Çubuğu */}
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
                    currentMastery={state.currentMastery}
                    progressQueue={progressQueue}
                    questionResults={questionResults}
                    selectedAnswer={state.selectedAnswer}
                  />
                </ErrorBoundary>

                {/* Soru Kartı */}
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

                {/* Alt Kontrol Paneli */}
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
                    isSubmitting={state.isLoading}
                    onPrev={onPrev}
                    onNext={onNext}
                    onConfirm={onConfirm}
                    onBlank={onBlank}
                    onToggleExplanation={onToggleExplanation}
                    historyLength={state.history.length}
                    progressQueue={progressQueue}
                    progressIndex={progressIndex}
                    questionResults={questionResults}
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
