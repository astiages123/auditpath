/**
 * QuizCard Component
 *
 * Displays a single quiz question with:
 * - KaTeX-rendered LaTeX formulas
 * - Interactive option selection
 * - Correct/incorrect visual feedback
 * - Animated explanation panel ("Hoca Notu")
 * - Keyboard navigation (1-5, A-E keys for selection)
 */

import { memo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  GraduationCap,
  RefreshCw,
  Loader2,
  ChevronDown,
  SkipForward,
  Brain,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { EvidenceCard } from './EvidenceCard';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/utils/core';
import { QuizQuestion } from '@/features/quiz/types';

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
  /** Called when user clicks "Boş Bırak" - skips question without answering */
  onBlank?: () => void;
  /** Course ID for evidence navigation */
  courseId?: string;
}

const optionLabels = ['A', 'B', 'C', 'D', 'E'];

// Key mappings for keyboard navigation
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

// Move plugin arrays outside to prevent unnecessary re-renders
const remarkPlugins = [remarkMath];
const rehypePlugins = [rehypeKatex];

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <span className="inline">{children}</span>
  ),
};

// Markdown renderer with KaTeX support
const MathText = memo(function MathText({ content }: { content: string }) {
  if (!content) return null;

  // Clean content: remove (image.ext) references, [GÖRSEL: X] markers and excessive newlines
  const cleanContent = content
    .replace(/\([\w-]+\.(webp|png|jpg|jpeg|gif)\)/gi, '')
    .replace(/\[GÖRSEL:\s*\d+\]/gi, '')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={markdownComponents}
    >
      {cleanContent}
    </ReactMarkdown>
  );
});

interface OptionButtonProps {
  option: string;
  index: number;
  label: string;
  variant: 'default' | 'correct' | 'incorrect' | 'dimmed';
  onClick: () => void;
  disabled: boolean;
}

const OptionButton = memo(function OptionButton({
  option,
  label,
  variant,
  onClick,
  disabled,
}: Omit<OptionButtonProps, 'index'>) {
  let containerStyle =
    'border-border hover:border-primary/50 hover:bg-muted/30';
  let iconComponent = null;
  let labelStyle = 'bg-muted text-muted-foreground';

  switch (variant) {
    case 'correct':
      containerStyle = 'border-emerald-500 bg-emerald-500/10';
      labelStyle = 'bg-emerald-500 text-white';
      iconComponent = (
        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-white" />
        </div>
      );
      break;
    case 'incorrect':
      containerStyle = 'border-red-500 bg-red-500/10';
      labelStyle = 'bg-red-500 text-white';
      iconComponent = (
        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <X className="w-4 h-4 text-white" />
        </div>
      );
      break;
    case 'dimmed':
      containerStyle = 'border-border opacity-50';
      break;
    case 'default':
    default:
      // kept initials
      break;
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
      className={cn(
        'w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
        containerStyle,
        !disabled && 'cursor-pointer'
      )}
    >
      <span
        className={cn(
          'w-8 h-8 min-w-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0',
          labelStyle
        )}
      >
        {label}
      </span>
      <div className="flex-1 pt-1 prose prose-sm prose-invert max-w-none">
        <MathText content={option} />
      </div>
      {iconComponent}
    </motion.button>
  );
});

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
  courseId,
}: QuizCardProps) {
  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // If already answered, ignore option keys
      if (isAnswered) return;

      // Check for option keys (1-5 or A-E)
      const index = KEY_TO_INDEX[e.key];
      if (index !== undefined && question && index < question.o.length) {
        e.preventDefault();
        onSelectAnswer(index);
        return;
      }

      // "B" or "Space" for blank (only if not a letter key was used)
      if ((e.key === 'b' || e.key === 'B') && onBlank && !KEY_TO_INDEX[e.key]) {
        // Note: 'b'/'B' is already mapped to option B, so we skip this
        return;
      }

      // Escape key for blank
      if (e.key === 'Escape' && onBlank) {
        e.preventDefault();
        toast.info('Soru boş bırakıldı');
        onBlank();
      }
    },
    [isAnswered, question, onSelectAnswer, onBlank]
  );

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground text-lg">
              Soru hazırlanıyor...
            </p>
            <p className="text-muted-foreground/60 text-sm">Soru Üretiliyor</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-card border border-destructive/30 rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-destructive font-medium text-lg">{error}</p>
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No question loaded
  if (!question) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
            <GraduationCap className="w-12 h-12" />
            <p className="text-lg">Soru bekleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
      >
        {/* Question Header */}
        <div className="px-6 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="w-4 h-4" />
            <span>Banka/İdari Soru</span>
          </div>
        </div>

        {/* Question Text & Image */}
        <div className="p-6">
          {/* Socratic Mentor Note (Insight) */}
          {question.insight && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
            >
              <div className="flex items-center gap-2 mb-2 text-amber-400 font-medium">
                <Lightbulb className="w-5 h-5" />
                <span>Mentorun Notu</span>
              </div>
              <p className="text-sm italic text-foreground/80 leading-relaxed">
                {question.insight}
              </p>
            </motion.div>
          )}

          {question.img !== undefined && question.img !== null && (
            <div className="mb-6 rounded-xl overflow-hidden border border-border bg-muted/20">
              <img
                src={
                  // New logic: resolve from imageUrls array using index
                  typeof question.img === 'number' &&
                  question.imageUrls?.[question.img]
                    ? question.imageUrls[question.img]
                    : typeof question.img === 'string'
                      ? `${question.imgPath || ''}${question.img}`
                      : ''
                }
                alt="Soru Görseli"
                className="w-full max-h-[300px] object-contain mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="text-lg leading-relaxed text-foreground prose prose-sm prose-invert max-w-none">
            <MathText content={question.q} />
          </div>
        </div>

        <div className="px-6 pb-6 space-y-3">
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
                // Blank answer -> dim all
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

        {/* Boş Bırak Button - Only visible before answering */}
        {!isAnswered && onBlank && (
          <div className="px-6 pb-4">
            <button
              onClick={onBlank}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all"
            >
              <SkipForward className="w-4 h-4" />
              Boş Bırak
            </button>
          </div>
        )}

        {/* Explanation Panel - "Hoca Notu" */}
        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border">
                <div
                  onClick={onToggleExplanation}
                  className="w-full px-6 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onToggleExplanation();
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">
                      Hoca Notu
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.span
                      animate={{ rotate: showExplanation ? 180 : 0 }}
                      className="text-muted-foreground"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.span>
                  </div>
                </div>

                <AnimatePresence>
                  {showExplanation && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 py-4 bg-primary/5 border-t border-primary/10">
                        <div
                          className={cn(
                            'prose prose-sm prose-invert max-w-none',
                            isCorrect ? 'text-emerald-300' : 'text-foreground'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {isCorrect ? (
                              <span className="text-2xl">✅</span>
                            ) : (
                              <span className="text-2xl">📚</span>
                            )}
                            <div className="flex-1">
                              {isCorrect && (
                                <p className="font-bold text-emerald-400 mb-2">
                                  Tebrikler! Doğru cevap.
                                </p>
                              )}
                              {!isCorrect && (
                                <p className="font-bold text-red-400 mb-2">
                                  Yanlış cevap. Doğru cevap:{' '}
                                  {optionLabels[question.a]}
                                </p>
                              )}

                              {question.insight && (
                                <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                  <div className="flex items-center gap-2 mb-1 text-indigo-400 font-semibold">
                                    <Brain className="w-4 h-4" />
                                    <span>AuditPath Teşhisi</span>
                                  </div>
                                  <p className="text-sm text-foreground/90 italic">
                                    {question.insight}
                                  </p>
                                </div>
                              )}

                              {/* Evidence Card */}
                              {question.evidence && courseId && (
                                <div className="mb-4">
                                  <EvidenceCard
                                    evidence={question.evidence}
                                    courseId={courseId}
                                  />
                                </div>
                              )}

                              <MathText content={question.exp} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export const QuizCard = memo(QuizCardComponent);
export default QuizCard;
