import { PostTestDashboard } from './PostTestDashboard';
import { calculateTestResults } from '@/features/quiz/logic/quizLogic';
import type { QuizState } from '@/features/quiz/types';

interface QuizOutcomeManagerProps {
  results: {
    correct: number;
    incorrect: number;
    blank: number;
    totalTimeMs: number;
  };
  history: QuizState['history'];
  courseName?: string;
  onClose?: () => void;
}

export function QuizOutcomeManager({
  results,
  history,
  courseName,
  onClose,
}: QuizOutcomeManagerProps) {
  return (
    <PostTestDashboard
      results={calculateTestResults(
        results.correct,
        results.incorrect,
        results.blank,
        results.totalTimeMs
      )}
      history={history}
      courseName={courseName}
      onClose={() => onClose?.()}
    />
  );
}
