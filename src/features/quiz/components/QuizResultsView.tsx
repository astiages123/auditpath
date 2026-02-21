import { useEffect, useState, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  CheckCircle2,
  HelpCircle,
  Clock,
  ShieldCheck,
  Brain,
  ChevronDown,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  type QuizQuestion,
  type ExamSubjectWeight,
} from '@/features/quiz/types';
import { calculateTestResults } from '@/features/quiz/logic/quizCoreLogic';
import { getSubjectStrategy } from '@/features/quiz/logic/srsLogic';
import { cn } from '@/utils/stringHelpers';

// ============================================================================
// Internal Sub-components (formerly standalone files)
// ============================================================================

const ScoreVisualizer = memo(
  ({
    percentage,
    animatedPercent,
  }: {
    percentage: number;
    animatedPercent: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card border border-border rounded-2xl p-6 flex-col flex-center relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="relative w-48 h-48 mb-4">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="88"
            className="stroke-muted fill-none"
            strokeWidth="12"
          />
          <circle
            cx="96"
            cy="96"
            r="88"
            strokeWidth="12"
            strokeDasharray={553}
            strokeDashoffset={553 - (553 * animatedPercent) / 100}
            strokeLinecap="round"
            className={cn(
              'fill-none transition-all duration-1000 ease-out',
              percentage >= 70 ? 'stroke-emerald-500' : 'stroke-amber-500'
            )}
          />
        </svg>
        <div className="absolute inset-0 flex-col flex-center">
          <span className="text-5xl font-bold tracking-tighter">
            {animatedPercent}
          </span>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-2">
            Başarı Puanı
          </span>
        </div>
      </div>
    </motion.div>
  )
);

const MetricsSummary = memo(
  ({
    masteryScore,
    pendingReview,
    totalTimeFormatted,
  }: {
    masteryScore: number;
    pendingReview: number;
    totalTimeFormatted: string;
  }) => (
    <div className="grid grid-cols-2 gap-4">
      {[
        {
          label: 'Ustalık Puanı',
          value: `${masteryScore}/100`,
          icon: CheckCircle2,
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
          delay: 0.2,
        },
        {
          label: 'Tekrar',
          value: pendingReview,
          icon: HelpCircle,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          delay: 0.3,
        },
        {
          label: 'Toplam Süre',
          value: totalTimeFormatted,
          icon: Clock,
          color: 'text-purple-500',
          bg: 'bg-purple-500/10',
          delay: 0.4,
          full: true,
        },
      ].map((item) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: item.delay }}
          className={cn(
            'bg-card border border-border rounded-xl p-5 flex flex-col justify-between',
            item.full && 'col-span-2'
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <div className={cn('p-2 rounded-lg', item.bg)}>
              <item.icon className={cn('w-5 h-5', item.color)} />
            </div>
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className={cn('text-3xl font-bold', item.full && 'font-mono')}>
            {item.value}
          </div>
        </motion.div>
      ))}
    </div>
  )
);

const LearningInsights = memo(
  ({
    percentage,
    pendingReview,
    courseName,
    strategy,
  }: {
    percentage: number;
    pendingReview: number;
    courseName?: string;
    strategy?: ExamSubjectWeight;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-muted/30 border border-border/50 rounded-xl p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {strategy ? 'Zeki Başarı Özeti' : 'Özet Durum'}
      </h3>
      <div className="space-y-4 text-sm text-balance leading-relaxed">
        {strategy ? (
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              {percentage >= 70 ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <Brain className="w-5 h-5" />
              )}
              <span className="font-bold uppercase tracking-wider text-xs">
                {strategy.importance === 'high'
                  ? 'Kritik Ders Analizi'
                  : 'Konu Değerlendirmesi'}
              </span>
            </div>
            <p className="text-muted-foreground">
              {percentage >= 85
                ? `Mükemmel! ${courseName} gibi önemli bir derste ustalığını kanıtladın.`
                : percentage >= 70
                  ? `Gayet iyi. Bu konuda temelini sağlamlaştırdın.`
                  : percentage >= 50
                    ? `${courseName} için biraz daha pratik yapmalısın.`
                    : `Eksiklerin var. Hata telafisi ile üzerinden geçelim.`}
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground">
            {pendingReview > 0 ? (
              <p>
                <span className="text-amber-500 font-medium">
                  {pendingReview} soru
                </span>{' '}
                tekrar listesine eklendi.
              </p>
            ) : (
              <p>
                <span className="text-emerald-500 font-medium">Mükemmel!</span>{' '}
                Hiçbir soru tekrar listesine düşmedi.
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
);

type QuizHistoryItem = QuizQuestion & {
  userAnswer: number | null;
  isCorrect: boolean | null;
};

const QuestionReviewList = memo(
  ({ history }: { history: QuizHistoryItem[] }) => {
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

// ============================================================================
// Main Results View
// ============================================================================

interface QuizResultsViewProps {
  results: {
    correct: number;
    incorrect: number;
    blank: number;
    totalTimeMs: number;
  };
  history: QuizHistoryItem[];
  courseName?: string;
  onClose?: () => void;
}

export function QuizResultsView({
  results,
  history = [],
  courseName,
  onClose,
}: QuizResultsViewProps) {
  const submitBtnClass = cn(
    'flex-1 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground',
    'font-bold transition-all shadow-lg flex-center gap-2'
  );
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const stats = useMemo(
    () =>
      calculateTestResults(
        results.correct,
        results.incorrect,
        results.blank,
        results.totalTimeMs
      ),
    [results.correct, results.incorrect, results.blank, results.totalTimeMs]
  );

  const strategy = useMemo(
    () => (courseName ? getSubjectStrategy(courseName) : undefined),
    [courseName]
  );

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPercent(stats.percentage), 500);
    return () => clearTimeout(timer);
  }, [stats.percentage]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-2"
      >
        <h2 className="text-3xl font-bold bg-linear-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          Test Tamamlandı!
        </h2>
        <p className="text-muted-foreground">Oturum başarıyla kaydedildi.</p>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScoreVisualizer
          percentage={stats.percentage}
          animatedPercent={animatedPercent}
        />
        <MetricsSummary
          masteryScore={stats.masteryScore}
          pendingReview={stats.pendingReview}
          totalTimeFormatted={stats.totalTimeFormatted}
        />
      </div>
      <LearningInsights
        percentage={stats.percentage}
        pendingReview={stats.pendingReview}
        courseName={courseName}
        strategy={strategy}
      />
      <QuestionReviewList history={history} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-4 pt-4"
      >
        <button onClick={onClose} className={submitBtnClass}>
          <Home className="w-5 h-5" /> Ana Menüye Dön
        </button>
      </motion.div>
    </div>
  );
}

// Export as QuizOutcomeManager for backward compatibility if needed, or update consumers
export const QuizOutcomeManager = QuizResultsView;
