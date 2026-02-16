import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ChevronDown, Brain } from 'lucide-react';
import { cn } from '@/utils/core';
import { QuizQuestion } from '@/features/quiz/types';
import { MathRenderer } from './MathRenderer';
import { EvidenceCard } from '../EvidenceCard';

interface ExplanationPanelProps {
  question: QuizQuestion;
  isCorrect: boolean | null;
  showExplanation: boolean;
  onToggleExplanation: () => void;
  courseId?: string;
  optionLabels: string[];
}

/**
 * ExplanationPanel component
 *
 * Displays the "Hoca Notu" (Trainer's Note) section after a question is answered.
 * Includes:
 * - Animated toggle for the explanation
 * - AuditPath Diagnostics (insights)
 * - Evidence references via EvidenceCard
 * - KaTeX rendered mathematical explanations
 */
export function ExplanationPanel({
  question,
  isCorrect,
  showExplanation,
  onToggleExplanation,
  courseId,
  optionLabels,
}: ExplanationPanelProps) {
  return (
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
          <span className="font-medium text-foreground">Hoca Notu</span>
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
                        Yanlış cevap. Doğru cevap: {optionLabels[question.a]}
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

export default ExplanationPanel;
