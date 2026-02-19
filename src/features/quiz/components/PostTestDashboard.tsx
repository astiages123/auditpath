import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  type TestResultSummary,
  type QuizQuestion,
} from '@/features/quiz/types';
import { getSubjectStrategy } from '@/features/quiz/logic/quizLogic';
import { Home } from 'lucide-react';

// Extracted Dashboard Components
import { ScoreVisualizer } from './ScoreVisualizer';
import { MetricsSummary } from './MetricsSummary';
import { LearningInsights } from './LearningInsights';
import { QuestionReviewList } from './QuestionReviewList';

interface PostTestDashboardProps {
  results: TestResultSummary;
  history?: (QuizQuestion & {
    userAnswer: number | null;
    isCorrect: boolean | null;
  })[];
  onClose: () => void;
  courseName?: string;
}

export function PostTestDashboard({
  results,
  history = [],
  onClose,
  courseName,
}: PostTestDashboardProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const strategy = courseName ? getSubjectStrategy(courseName) : null;

  useEffect(() => {
    // Animate percentage
    const timer = setTimeout(() => {
      setAnimatedPercent(results.percentage);
    }, 500);
    return () => clearTimeout(timer);
  }, [results.percentage]);

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

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScoreVisualizer
          percentage={results.percentage}
          animatedPercent={animatedPercent}
        />
        <MetricsSummary
          masteryScore={results.masteryScore}
          pendingReview={results.pendingReview}
          totalTimeFormatted={results.totalTimeFormatted}
        />
      </div>

      <LearningInsights
        percentage={results.percentage}
        pendingReview={results.pendingReview}
        courseName={courseName}
        strategy={strategy}
      />

      <QuestionReviewList history={history} />

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-4 pt-4"
      >
        <button
          onClick={onClose}
          className="flex-1 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          Ana Menüye Dön
        </button>
      </motion.div>
    </div>
  );
}

export default PostTestDashboard;
