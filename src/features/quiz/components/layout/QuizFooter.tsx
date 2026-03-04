import { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Brain } from 'lucide-react';
import { ProgressDots } from '@/features/quiz/components/content/QuizStatus';
import { cn } from '@/utils/stringHelpers';
import { Button } from '@/components/ui/button';

// === TYPES: QUIZ FOOTER ===

interface QuizFooterProps {
  /** Sorunun cevaplanıp cevaplanmadığı */
  isAnswered: boolean;
  /** Çözüm panelinin görünürlüğü */
  showExplanation: boolean;
  /** Seçili seçeneğin indeksi */
  selectedAnswer: number | null;
  /** İşlem (submit/next) devam ediyor mu? */
  isSubmitting: boolean;
  /** Geçmiş (history) uzunluğu (Geri butonu için) */
  historyLength: number;
  /** Geri butonuna tıklanınca tetiklenir */
  onPrev: () => void;
  /** Sonraki butonuna tıklanınca tetiklenir */
  onNext: () => void;
  /** Onayla butonuna tıklanınca tetiklenir */
  onConfirm: () => void;
  /** Boş bırak butonuna tıklanınca tetiklenir */
  onBlank: () => void;
  /** Çözümü aç/kapat tıklandığında tetiklenir */
  onToggleExplanation: () => void;
  /** Soru havuzu ID listesi (noktalar için) */
  progressQueue: string[];
  /** Mevcut sorunun indeksi */
  progressIndex: number;
  /** Soru sonuç haritası (başarı renkleri için) */
  questionResults: Record<string, 'correct' | 'incorrect' | 'blank'>;
}

// === COMPONENT: QUIZ FOOTER ===

/**
 * Aktif soru cevaplama ekranının alt çubuğu.
 * İlerleme noktalarını, kontrol butonlarını ve çözüm panelini tetikleyen butonları içerir.
 */
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
  // === RENDER LOGIC ===

  const isNextActive = isAnswered || selectedAnswer !== null;

  const footerWrapperClass = cn(
    'bg-black/30 backdrop-blur-md px-3 md:px-6 lg:px-10 py-2 md:py-4 border-t border-white/5',
    'flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 mt-auto'
  );

  const prevBtnClass = cn('h-auto py-2 px-3', 'flex-none');

  const nextBtnClass = cn(
    'px-3 sm:px-6 h-auto py-2 font-bold text-xs sm:text-sm',
    'duration-200 flex font-heading group flex-none',
    isNextActive ? 'shadow-lg shadow-primary/10 hover:bg-primary/90' : ''
  );

  // === RENDER ===

  return (
    <footer className={footerWrapperClass}>
      {/* İlerleme Noktaları */}
      <ProgressDots
        progressQueue={progressQueue}
        progressIndex={progressIndex}
        questionResults={questionResults}
        selectedAnswer={selectedAnswer}
      />

      <div className="flex items-center gap-2 md:gap-6 w-full md:w-auto justify-end md:justify-start">
        {/* Geri Butonu (Sadece geçmiş varsa) */}
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

        {/* Çözümü Gör Butonu (Sadece cevaplandıktan sonra) */}
        <AnimatePresence mode="wait">
          {isAnswered && !showExplanation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 10 }}
              className="flex-none flex"
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

        {/* Ana Aksiyon Butonu (Cevapla / Sonraki) */}
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

// === TYPES: ACTION FOOTER ===

interface QuizActionFooterProps {
  /** Quiz ara yüzünde butonun görünürlüğü için durum */
  isAnswered: boolean;
  /** İşlem devam ediyor mu? */
  isSubmitting: boolean;
  /** Mevcut sıradaki soru sayısı */
  queueLength: number;
  /** Mevcut set indeksi */
  currentBatchIndex: number;
  /** Toplam set sayısı */
  totalBatches: number;
  /** Sonraki butona basıldığında tetiklenir */
  onNext: () => void;
}

// === COMPONENT: ACTION FOOTER ===

/**
 * Geçiş ekranları veya set bitişleri için merkezi butonu temsil eder.
 */
export function QuizActionFooter({
  isAnswered,
  isSubmitting,
  queueLength,
  currentBatchIndex,
  totalBatches,
  onNext,
}: QuizActionFooterProps) {
  // === RENDER LOGIC ===

  if (!isAnswered) return null;

  const btnClass = cn(
    'flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl',
    'font-semibold text-lg transition-all shadow-lg hover:shadow-primary/25',
    isSubmitting
      ? 'bg-primary/70 cursor-not-allowed'
      : 'bg-primary hover:bg-primary/90 active:scale-[0.98]'
  );

  // === RENDER ===

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
