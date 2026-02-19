import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ChevronDown,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { QuizQuestion } from '@/features/quiz/types';

interface QuestionReviewListProps {
  history: (QuizQuestion & {
    userAnswer: number | null;
    isCorrect: boolean | null;
  })[];
}

export const QuestionReviewList = ({ history }: QuestionReviewListProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: history.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  if (history.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="border border-border rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full p-4 flex items-center justify-between bg-muted/20 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 font-medium">
          <Brain className="w-5 h-5 text-primary" />
          <span>Soru Geçmişi</span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full ml-2">
            {history.length} Soru
          </span>
        </div>
        <motion.div
          animate={{ rotate: showHistory ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              ref={parentRef}
              className="max-h-[400px] overflow-y-auto custom-scrollbar p-1 bg-muted/10 border-t border-border"
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const item = history[virtualItem.index];
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      className="px-4 border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Soru #{virtualItem.index + 1}
                        </p>
                        <p className="text-sm line-clamp-2 text-white/90">
                          {item.q}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {item.isCorrect === true ? (
                          <div className="flex items-center gap-1.5 text-emerald-500">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">
                              Doğru
                            </span>
                          </div>
                        ) : item.isCorrect === false ? (
                          <div className="flex items-center gap-1.5 text-red-500">
                            <XCircle className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">
                              Yanlış
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MinusCircle className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">
                              Boş
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
