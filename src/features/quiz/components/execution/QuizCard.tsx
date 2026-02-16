import { memo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Loader2, SkipForward, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { QuizQuestion } from '@/features/quiz/types';

import { MathRenderer } from './card/MathRenderer';
import { OptionButton } from './card/OptionButton';
import { ExplanationPanel } from './card/ExplanationPanel';

interface QuizCardProps {
  question: QuizQuestion | null;
  selectedAnswer: number | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
  showExplanation: boolean;
  isLoading: boolean;
  error: string | null;
  onSelectAnswer: (index: number) => void;
  onToggleExplanation: () => void;
  onRetry: () => void;
  onBlank?: () => void;
}

const optionLabels = ['A', 'B', 'C', 'D', 'E'];

const KEY_TO_INDEX: Record<string, number> = {
  '1': 0,
  a: 0,
  A: 0,
  '2': 1,
  b: 1,
  B: 1,
  '3': 2,
  c: 2,
  C: 2,
  '4': 3,
  d: 3,
  D: 3,
  '5': 4,
  e: 4,
  E: 4,
};

function QuizCardComponent({
  question,
  selectedAnswer,
  isAnswered,
  isCorrect,
  showExplanation,
  isLoading,
  error,
  onSelectAnswer,
  onToggleExplanation,
  onRetry,
  onBlank,
}: QuizCardProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (isAnswered) return;

      const index = KEY_TO_INDEX[e.key];
      if (index !== undefined && question && index < question.o.length) {
        e.preventDefault();
        onSelectAnswer(index);
        return;
      }

      if (e.key === 'Escape' && onBlank) {
        e.preventDefault();
        toast.info('Soru boş bırakıldı');
        onBlank();
      }
    },
    [isAnswered, question, onSelectAnswer, onBlank]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border/50 rounded-xl p-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Soru hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-destructive/20 rounded-xl p-8 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="w-7 h-7 text-destructive" />
          </div>
          <p className="text-destructive font-medium">{error}</p>
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border/50 rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p>Soru bekleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/50 rounded-xl overflow-hidden"
      >
        <div className="p-5 space-y-4">
          {question.insight && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
            >
              <div className="flex items-center gap-2 text-amber-400/80 text-xs font-medium mb-1">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>İpucu</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {question.insight}
              </p>
            </motion.div>
          )}

          {question.img !== undefined && question.img !== null && (
            <div className="rounded-lg overflow-hidden border border-border/30 bg-muted/20">
              <img
                src={
                  typeof question.img === 'number' &&
                  question.imageUrls?.[question.img]
                    ? question.imageUrls[question.img]
                    : typeof question.img === 'string'
                      ? `${question.imgPath || ''}${question.img}`
                      : ''
                }
                alt="Soru Görseli"
                className="w-full max-h-[250px] object-contain mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="text-base leading-relaxed text-foreground">
            <MathRenderer content={question.q} />
          </div>
        </div>

        <div className="px-5 pb-5 space-y-2.5">
          {question.o.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = question.a === index;

            let variant: 'default' | 'correct' | 'incorrect' | 'dimmed' =
              'default';

            if (isAnswered) {
              const showCorrectness = selectedAnswer !== null;
              if (showCorrectness) {
                if (isCorrectOption) {
                  variant = 'correct';
                } else if (isSelected && !isCorrectOption) {
                  variant = 'incorrect';
                } else {
                  variant = 'dimmed';
                }
              } else {
                variant = 'dimmed';
              }
            }

            return (
              <OptionButton
                key={index}
                option={option}
                label={optionLabels[index]}
                variant={variant}
                onClick={() => !isAnswered && onSelectAnswer(index)}
                disabled={isAnswered}
              />
            );
          })}
        </div>

        {!isAnswered && onBlank && (
          <div className="px-5 pb-4">
            <button
              onClick={onBlank}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border/50 hover:border-primary/30 hover:bg-primary/5 rounded-lg transition-all"
            >
              <SkipForward className="w-4 h-4" />
              Boş Bırak
            </button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border/50 rounded-xl overflow-hidden"
          >
            <ExplanationPanel
              question={question}
              isCorrect={isCorrect}
              showExplanation={showExplanation}
              onToggleExplanation={onToggleExplanation}
              optionLabels={optionLabels}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const QuizCard = memo(QuizCardComponent);
export default QuizCard;
