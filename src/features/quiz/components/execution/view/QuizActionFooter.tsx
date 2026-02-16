import { Loader2, ArrowRight } from 'lucide-react';
import { type SubmissionResult } from '@/features/quiz/types';

interface QuizActionFooterProps {
  isAnswered: boolean;
  isSubmitting: boolean;
  queueLength: number;
  currentBatchIndex: number;
  totalBatches: number;
  lastSubmissionResult: SubmissionResult | null;
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

export default QuizActionFooter;
