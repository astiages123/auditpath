import { memo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Loader2, Lightbulb } from 'lucide-react';
import { QuizQuestion } from '@/features/quiz/types';

import { MathRenderer } from './QuizStatus';
import { OptionButton } from './OptionButton';
import { ExplanationPanel } from './ExplanationPanel';

// --- Main Component ---

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
  const explanationRef = useRef<HTMLDivElement>(null);

  // Scroll into view when explanation is shown on mobile
  useEffect(() => {
    if (isAnswered && showExplanation && window.innerWidth < 1024) {
      // Small delay to allow AnimatePresence to complete entry animation
      const timer = setTimeout(() => {
        explanationRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isAnswered, showExplanation]);

  // Use a Ref to keep the event listener stable while still having access to latest state/props
  const stateRef = useRef({
    question,
    isAnswered,
    onSelectAnswer,
    onBlank,
  });

  // Update ref when props change via useEffect to avoid updating ref during render
  useEffect(() => {
    stateRef.current = {
      question,
      isAnswered,
      onSelectAnswer,
      onBlank,
    };
  }, [question, isAnswered, onSelectAnswer, onBlank]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const {
        question: currentQuestion,
        isAnswered: currentIsAnswered,
        onSelectAnswer: currentOnSelectAnswer,
        onBlank: currentOnBlank,
      } = stateRef.current;

      // 2. Don't trigger if already answered or if modifier keys are pressed
      if (currentIsAnswered || e.ctrlKey || e.metaKey) return;

      // 3. Handle Option selection (A-E or 1-5)
      const index = KEY_TO_INDEX[e.key];
      if (
        index !== undefined &&
        currentQuestion &&
        index < currentQuestion.o.length
      ) {
        e.preventDefault();
        currentOnSelectAnswer(index);
        return;
      }

      // 4. Handle Blank (Escape)
      if (e.key === 'Escape' && currentOnBlank) {
        e.preventDefault();
        currentOnBlank();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array means this only runs once

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
    <motion.div
      animate={{ maxWidth: isAnswered && showExplanation ? '1152px' : '896px' }}
      transition={{ type: 'spring', damping: 32, stiffness: 160 }}
      className="w-full mx-auto py-1 md:py-2 flex flex-col h-full overflow-hidden"
    >
      <div
        className={`flex flex-col lg:flex-row gap-4 md:gap-4 h-full min-h-0 ${isAnswered && showExplanation ? 'overflow-y-auto lg:overflow-hidden' : 'overflow-hidden'}`}
      >
        {/* Question Side */}
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 32, stiffness: 160 }}
          className={`w-full shrink-0 flex flex-col transition-all duration-500 ${
            isAnswered && showExplanation
              ? 'h-auto lg:h-full lg:w-[64%]'
              : 'h-full w-full'
          }`}
        >
          <div className="bg-transparent flex flex-col h-full min-h-0 group">
            <div
              className={`p-2 md:p-3 space-y-3 md:space-y-4 flex-1 min-h-0 ${isAnswered && showExplanation ? 'lg:overflow-y-auto' : 'overflow-y-auto'} custom-scrollbar`}
            >
              <div className="space-y-3">
                {question.insight && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
                  >
                    <div className="flex items-center gap-2 text-amber-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 font-heading">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>İpucu</span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                      {question.insight}
                    </p>
                  </motion.div>
                )}

                {question.img !== undefined && question.img !== null && (
                  <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/5">
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
                      className="w-full max-h-[160px] object-contain mx-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="text-lg md:text-xl font-medium text-white/90 leading-relaxed font-sans">
                  <MathRenderer content={question.q} />
                </div>
              </div>

              <div className="flex flex-col gap-2 md:gap-3">
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
                      isSelected={isSelected}
                      onClick={() => !isAnswered && onSelectAnswer(index)}
                      disabled={isAnswered}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Explanation Side */}
        <AnimatePresence>
          {isAnswered && showExplanation && (
            <motion.div
              ref={explanationRef}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 32, stiffness: 160 }}
              className="w-full lg:flex-1 h-auto lg:h-full min-h-0"
            >
              <div className="bg-card border border-white/5 rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col">
                <ExplanationPanel
                  question={question}
                  isCorrect={isCorrect}
                  showExplanation={showExplanation}
                  onToggleExplanation={onToggleExplanation}
                  optionLabels={optionLabels}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export const QuizCard = memo(QuizCardComponent);
export default QuizCard;
