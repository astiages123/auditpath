import { memo, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ChevronDown,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type QuizHistoryItem } from '@/features/quiz/types';

interface QuestionReviewListProps {
  history: QuizHistoryItem[];
}

/**
 * Quiz sırasında çözülen soruların listesi (Virtualizer destekli).
 */
export const QuestionReviewList = memo(
  ({ history }: QuestionReviewListProps) => {
    const [showHistory, setShowHistory] = useState(false);
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizerOptions = useMemo(
      () => ({
        count: history.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 100,
        overscan: 5,
      }),
      [history.length]
    );

    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer(virtualizerOptions);

    if (history.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-border rounded-xl overflow-hidden"
      >
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-4 flex-between bg-muted/20 hover:bg-muted/30"
        >
          <div className="flex items-center gap-2 font-medium">
            <Brain className="w-5 h-5 text-primary" />
            <span>Soru Geçmişi</span>
          </div>
          <motion.div animate={{ rotate: showHistory ? 180 : 0 }}>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </button>
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div
                ref={parentRef}
                className="max-h-[400px] overflow-y-auto p-1 bg-muted/10 border-t"
              >
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((v) => {
                    const item = history[v.index];
                    return (
                      <div
                        key={v.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${v.size}px`,
                          transform: `translateY(${v.start}px)`,
                        }}
                        className="px-4 border-b border-border/50 flex-between gap-4"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs text-muted-foreground">
                            Soru #{v.index + 1}
                          </p>
                          <p className="text-sm line-clamp-2">{item.q}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {item.isCorrect === true ? (
                            <div className="text-emerald-500 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Doğru</span>
                            </div>
                          ) : item.isCorrect === false ? (
                            <div className="text-red-500 flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              <span>Yanlış</span>
                            </div>
                          ) : (
                            <div className="text-muted-foreground flex items-center gap-1">
                              <MinusCircle className="w-4 h-4" />
                              <span>Boş</span>
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
  }
);

QuestionReviewList.displayName = 'QuestionReviewList';
