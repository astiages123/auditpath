import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Brain } from 'lucide-react';
import { ProgressDots } from './QuizStatus';

// ============================================================================
// Quiz Footer (Active Answering State)
// ============================================================================

interface QuizFooterProps {
  isAnswered: boolean;
  showExplanation: boolean;
  selectedAnswer: number | null;
  isSubmitting: boolean;
  historyLength: number;
  onPrev: () => void;
  onNext: () => void;
  onConfirm: () => void;
  onBlank: () => void;
  onToggleExplanation: () => void;
  // Progress Dots props
  progressQueue: string[];
  progressIndex: number;
  questionResults: Record<string, 'correct' | 'incorrect' | 'blank'>;
}

export const QuizFooter: React.FC<QuizFooterProps> = ({
  isAnswered,
  showExplanation,
  selectedAnswer,
  isSubmitting,
  historyLength,
  onPrev,
  onNext,
  onConfirm,
  onBlank,
  onToggleExplanation,
  progressQueue,
  progressIndex,
  questionResults,
}) => {
  return (
    <footer className="bg-black/30 backdrop-blur-md px-6 md:px-10 py-3 md:py-4 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto">
      <ProgressDots
        progressQueue={progressQueue}
        progressIndex={progressIndex}
        questionResults={questionResults}
        selectedAnswer={selectedAnswer}
      />

      <div className="flex items-center gap-6 w-full md:w-auto">
        {historyLength > 0 && (
          <button
            onClick={onPrev}
            disabled={isSubmitting}
            className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="md:hidden lg:inline text-xs font-bold uppercase tracking-wider">
              Geri
            </span>
          </button>
        )}

        <AnimatePresence mode="wait">
          {isAnswered && !showExplanation && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 10 }}
              onClick={onToggleExplanation}
              className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Çözümü Gör
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <button
          onClick={
            isAnswered ? onNext : selectedAnswer !== null ? onConfirm : onBlank
          }
          disabled={isSubmitting}
          className={`flex-1 md:flex-none px-6 py-2 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 font-heading active:scale-95 disabled:opacity-50 group ${
            isAnswered || selectedAnswer !== null
              ? 'bg-primary text-black shadow-lg shadow-primary/10 hover:bg-primary/90'
              : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white'
          }`}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>
                {isAnswered
                  ? 'Sonraki Soru'
                  : selectedAnswer !== null
                    ? 'Cevapla'
                    : 'Boş Bırak'}
              </span>
              <ArrowRight
                className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                  isAnswered || selectedAnswer !== null
                    ? 'text-black'
                    : 'text-white/20 group-hover:text-white/60'
                }`}
              />
            </>
          )}
        </button>
      </div>
    </footer>
  );
};

// ============================================================================
// Quiz Action Footer (Transition/Batch Finished State)
// ============================================================================

interface QuizActionFooterProps {
  isAnswered: boolean;
  isSubmitting: boolean;
  queueLength: number;
  currentBatchIndex: number;
  totalBatches: number;
  onNext: () => void;
}

export function QuizActionFooter({
  isAnswered,
  isSubmitting,
  queueLength,
  currentBatchIndex,
  totalBatches,
  onNext,
}: QuizActionFooterProps) {
  if (!isAnswered) return null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onNext}
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
            : queueLength > 0
              ? `Sıradaki Soru (${queueLength})`
              : currentBatchIndex < totalBatches - 1
                ? 'Sonraki Set'
                : 'Testi Bitir'}
        </button>
      </div>
    </div>
  );
}
