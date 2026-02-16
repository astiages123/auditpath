import React from 'react';
import { QuizTimer } from './QuizTimer';
import { type CourseStats } from '@/features/quiz/types';

interface QuizSessionStatsProps {
  courseStats: CourseStats | null;
  currentReviewIndex: number;
  totalQueueLength: number;
  timerIsRunning: boolean;
  currentQuestionId?: string;
}

export const QuizSessionStats: React.FC<QuizSessionStatsProps> = ({
  courseStats,
  currentReviewIndex,
  totalQueueLength,
  timerIsRunning,
  currentQuestionId,
}) => {
  if (!courseStats) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl border border-border/50">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Toplam Çözülen
          </span>
          <span className="text-lg font-bold text-primary">
            {courseStats.totalQuestionsSolved} Soru
          </span>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Ortalama Başarı
          </span>
          <span className="text-lg font-bold text-emerald-500">
            %{courseStats.averageMastery}
          </span>
        </div>
      </div>
      {/* Session Progress */}
      <div className="text-right flex flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Oturum
        </span>
        <div className="text-sm font-medium">
          {/* Global Progress: currentReviewIndex (0-based) + 1 / Total Queue Length */}
          Soru {currentReviewIndex + 1} / {totalQueueLength ?? 0}
        </div>
        <QuizTimer
          key={currentQuestionId ?? 'timer'}
          isRunning={timerIsRunning}
        />
      </div>
    </div>
  );
};
