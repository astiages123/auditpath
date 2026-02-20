import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { QuizQuestion } from '@/features/quiz/types';
import { MathRenderer } from './QuizStatus';

interface ExplanationPanelProps {
  question: QuizQuestion;
  isCorrect: boolean | null;
  showExplanation: boolean;
  onToggleExplanation: () => void;
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
