import { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Brain } from 'lucide-react';
import { ProgressDots } from './QuizStatus';
import { cn } from '@/utils/stringHelpers';
import { Button } from '@/components/ui/button';

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

export const QuizFooter: FC<QuizFooterProps> = ({
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
  const isNextActive = isAnswered || selectedAnswer !== null;

  const footerWrapperClass = cn(
    'bg-black/30 backdrop-blur-md px-6 md:px-10 py-3 md:py-4 border-t border-white/5',
    'flex flex-col md:flex-row items-center justify-between gap-4 mt-auto'
  );

  const prevBtnClass = cn(
    'flex-1 md:flex-none h-auto py-2 px-2 sm:px-4',
    'md:w-auto w-full'
  );

  const nextBtnClass = cn(
    'flex-1 md:flex-none px-3 sm:px-6 h-auto py-2 font-bold text-xs sm:text-sm',
    'duration-200 flex font-heading group',
    isNextActive ? 'shadow-lg shadow-primary/10 hover:bg-primary/90' : ''
  );

  return (
    <footer className={footerWrapperClass}>
      <ProgressDots
        progressQueue={progressQueue}
        progressIndex={progressIndex}
        questionResults={questionResults}
        selectedAnswer={selectedAnswer}
      />

      <div className="flex items-center gap-2 md:gap-6 w-full md:w-auto">
        {historyLength > 0 && (
          <Button
            variant="glass-subtle"
            onClick={onPrev}
            disabled={isSubmitting}
            className={prevBtnClass}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="md:hidden lg:inline text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
              Geri
            </span>
          </Button>
        )}

        <AnimatePresence mode="wait">
          {isAnswered && !showExplanation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 10 }}
              className="flex-1 md:flex-none flex"
            >
              <Button
                variant="primary-soft"
                onClick={onToggleExplanation}
                className="w-full h-auto py-2 px-2 sm:px-4"
              >
                <Brain className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                  Çözümü Gör
                </span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant={isNextActive ? 'default' : 'glass-subtle'}
          onClick={
            isAnswered ? onNext : selectedAnswer !== null ? onConfirm : onBlank
          }
          disabled={isSubmitting}
          className={nextBtnClass}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span className="whitespace-nowrap">
                {isAnswered
                  ? 'Sonraki Soru'
                  : selectedAnswer !== null
                    ? 'Cevapla'
                    : 'Boş Bırak'}
              </span>
              <ArrowRight
                className={cn(
                  'w-4 h-4 transition-transform group-hover:translate-x-1',
                  isNextActive
                    ? 'text-black'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
            </>
          )}
        </Button>
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

  const btnClass = cn(
    'flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl',
    'font-semibold text-lg transition-all shadow-lg hover:shadow-primary/25',
    isSubmitting
      ? 'bg-primary/70 cursor-not-allowed'
      : 'bg-primary hover:bg-primary/90 active:scale-[0.98]'
  );

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={onNext} disabled={isSubmitting} className={btnClass}>
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
