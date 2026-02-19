import { memo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RefreshCw,
  Loader2,
  Lightbulb,
  Check,
  Brain,
  ChevronDown,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { QuizQuestion } from '@/features/quiz/types';
import { cn } from '@/utils/core';

import { MathRenderer } from './QuizStatus';

// --- Sub-components (formerly separate files) ---

interface OptionButtonProps {
  option: string;
  label: string;
  variant: 'default' | 'correct' | 'incorrect' | 'dimmed';
  isSelected?: boolean;
  onClick: () => void;
  disabled: boolean;
}

const OptionButton = memo(function OptionButton({
  option,
  label,
  variant,
  isSelected,
  onClick,
  disabled,
}: OptionButtonProps) {
  let containerStyle =
    'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10';
  let iconComponent = null;
  let labelStyle =
    'bg-white/10 text-white/60 group-hover:bg-white/20 group-hover:text-white';

  if (isSelected && variant === 'default') {
    containerStyle = 'border-primary/60 bg-primary/5 hover:bg-primary/10';
    labelStyle = 'bg-primary/20 text-primary group-hover:bg-primary/30';
  }

  switch (variant) {
    case 'correct':
      containerStyle = 'border-primary bg-primary/10';
      labelStyle = 'bg-primary text-black';
      iconComponent = (
        <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center bg-primary text-black ml-auto">
          <Check className="w-3.5 h-3.5 font-black" />
        </div>
      );
      break;
    case 'incorrect':
      containerStyle = 'border-red-500/50 bg-red-500/10';
      labelStyle = 'bg-red-500 text-white';
      iconComponent = (
        <div className="w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center bg-red-500 text-white ml-auto">
          <X className="w-3.5 h-3.5 font-black" />
        </div>
      );
      break;
    case 'dimmed':
      containerStyle = 'border-white/5 opacity-40';
      break;
    case 'default':
    default:
      break;
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.005 } : {}}
      whileTap={!disabled ? { scale: 0.995 } : {}}
      className={cn(
        'group w-full flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl border transition-all duration-200 text-left',
        containerStyle,
        !disabled && 'cursor-pointer'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 min-w-[32px] rounded-lg flex items-center justify-center font-bold text-sm transition-colors',
          labelStyle
        )}
      >
        {label}
      </div>
      <div className="flex-1 font-medium text-base text-white/70 group-hover:text-white transition-colors">
        <MathRenderer content={option} />
      </div>
      {iconComponent}
    </motion.button>
  );
});

interface ExplanationPanelProps {
  question: QuizQuestion;
  isCorrect: boolean | null;
  showExplanation: boolean;
  onToggleExplanation: () => void;
  optionLabels: string[];
}

function ExplanationPanel({
  question,
  isCorrect,
  showExplanation,
  onToggleExplanation,
  optionLabels,
}: ExplanationPanelProps) {
  return (
    <div className="flex flex-col h-full bg-transparent">
      <div
        onClick={onToggleExplanation}
        className="w-full px-6 py-4 flex items-center justify-between bg-black/10 hover:bg-black/20 transition-all cursor-pointer border-b border-white/5"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onToggleExplanation();
          }
        }}
      >
        <div className="flex items-center gap-2 text-primary">
          <Brain className="w-5 h-5" />
          <h3 className="font-bold text-sm uppercase tracking-widest font-heading">
            Çözüm
          </h3>
        </div>
        <motion.span
          animate={{ rotate: showExplanation ? 180 : 0 }}
          className="text-white/40"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.span>
      </div>

      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto custom-scrollbar"
          >
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3">
                {isCorrect ? (
                  <div className="flex items-center gap-2 text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-bold text-xs uppercase tracking-wider">
                      Doğru Cevap
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20">
                    <XCircle className="w-4 h-4" />
                    <span className="font-bold text-xs uppercase tracking-wider">
                      Yanlış - Doğru Seçenek: {optionLabels[question.a]}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {question.insight && (
                  <p className="text-sm leading-relaxed text-white/70 italic">
                    {question.insight}
                  </p>
                )}

                <div className="p-5 bg-black/30 border border-white/5 rounded-xl font-sans text-sm leading-relaxed text-white/80">
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-transparent">
                    <MathRenderer content={question.exp} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (isAnswered || e.ctrlKey || e.metaKey) return;

      const index = KEY_TO_INDEX[e.key];
      if (index !== undefined && question && index < question.o.length) {
        e.preventDefault();
        onSelectAnswer(index);
        return;
      }

      if (e.key === 'Escape' && onBlank) {
        e.preventDefault();
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
    <motion.div
      animate={{ maxWidth: isAnswered && showExplanation ? '1152px' : '896px' }} // max-w-6xl (72rem/1152px) vs max-w-4xl (56rem/896px)
      transition={{ type: 'spring', damping: 32, stiffness: 160 }}
      className="w-full mx-auto py-1 md:py-2 flex flex-col h-full"
    >
      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 overflow-hidden">
        {/* Question Side */}
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 32, stiffness: 160 }}
          className={`w-full h-full flex flex-col ${isAnswered && showExplanation ? 'lg:w-[65%]' : 'w-full'}`}
        >
          <div className="bg-transparent flex flex-col h-full min-h-0 group">
            <div className="p-2 md:p-3 space-y-3 md:space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
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
              layout
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: '35%' }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              transition={{ type: 'spring', damping: 32, stiffness: 160 }}
              className="w-full h-full min-h-0"
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
