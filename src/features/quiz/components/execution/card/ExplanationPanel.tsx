import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  ChevronDown,
  Brain,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { QuizQuestion } from '@/features/quiz/types';
import { MathRenderer } from './MathRenderer';

interface ExplanationPanelProps {
  question: QuizQuestion;
  isCorrect: boolean | null;
  showExplanation: boolean;
  onToggleExplanation: () => void;
  courseId?: string;
  optionLabels: string[];
}

export function ExplanationPanel({
  question,
  isCorrect,
  showExplanation,
  onToggleExplanation,
  optionLabels,
}: ExplanationPanelProps) {
  return (
    <div className="border-t border-border/50">
      <div
        onClick={onToggleExplanation}
        className="w-full px-5 py-3 flex items-center justify-between bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onToggleExplanation();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary/70" />
          <span className="font-medium text-sm text-foreground/80">Çözüm</span>
        </div>
        <motion.span
          animate={{ rotate: showExplanation ? 180 : 0 }}
          className="text-muted-foreground"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </div>

      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 bg-muted/10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {isCorrect ? (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Doğru Cevap</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-400">
                      <XCircle className="w-5 h-5" />
                      <span className="font-semibold">
                        Yanlış - Doğru: {optionLabels[question.a]}
                      </span>
                    </div>
                  )}
                </div>

                {question.insight && (
                  <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-1.5 text-primary/80 font-medium text-xs uppercase tracking-wide">
                      <Brain className="w-3.5 h-3.5" />
                      <span>İpucu</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {question.insight}
                    </p>
                  </div>
                )}

                <div className="text-md text-foreground/90 leading-relaxed">
                  <MathRenderer content={question.exp} />
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
