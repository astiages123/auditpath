import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { type QuizHistoryItem } from '@/features/quiz/types';
import { calculateTestResults } from '@/features/quiz/logic/quizCoreLogic';
import { getSubjectStrategy } from '@/features/quiz/logic/quizParser';
import { cn } from '@/utils/stringHelpers';

// Sub-components
import { ScoreVisualizer } from '../content/ScoreVisualizer';
import { MetricsSummary } from '../content/MetricsSummary';
import { LearningInsights } from '../content/LearningInsights';
import { QuestionReviewList } from '../content/QuestionReviewList';

interface QuizResultsViewProps {
  /** Quiz sonuç verileri */
  results: {
    correct: number;
    incorrect: number;
    blank: number;
    totalTimeMs: number;
  };
  /** Yanıtlanan soruların geçmişi */
  history: QuizHistoryItem[];
  /** Kurs adı (opsiyonel) */
  courseName?: string;
  /** Kapatma handler'ı */
  onClose?: () => void;
}

/**
 * Quiz tamamlandığında gösterilen sonuç özet ekranı.
 * Başarı puanı, metrikler, içgörüler ve soru geçmişini içerir.
 */
export function QuizResultsView({
  results,
  history = [],
  courseName,
  onClose,
}: QuizResultsViewProps) {
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

  const submitBtnClass = cn(
    'flex-1 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground',
    'font-bold transition-all shadow-lg flex-center gap-2'
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-3 md:p-6">
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

      {/* Ana Metrikler */}
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

      {/* İçgörüler & Geçmiş */}
      <LearningInsights
        percentage={stats.percentage}
        pendingReview={stats.pendingReview}
        courseName={courseName}
        strategy={strategy}
      />
      <QuestionReviewList history={history} />

      {/* Aksiyon Butonları */}
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

// Geriye dönük uyumluluk için alias
export const QuizOutcomeManager = QuizResultsView;
