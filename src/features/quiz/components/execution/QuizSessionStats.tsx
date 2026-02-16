import React from 'react';
import { QuizTimer } from './QuizTimer';
import { type CourseStats } from '@/features/quiz/types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface QuizSessionStatsProps {
  courseStats: CourseStats | null;
  currentReviewIndex: number;
  totalQueueLength: number;
  timerIsRunning: boolean;
  currentQuestionId?: string;
  currentMastery?: number;
  lastSubmissionResult?: {
    scoreDelta: number;
    newMastery: number;
  } | null;
}

export const QuizSessionStats: React.FC<QuizSessionStatsProps> = ({
  courseStats,
  currentReviewIndex,
  totalQueueLength,
  timerIsRunning,
  currentQuestionId,
  currentMastery,
  lastSubmissionResult,
}) => {
  if (!courseStats) return null;

  const masteryDelta = lastSubmissionResult?.scoreDelta ?? null;
  const mastery = currentMastery ?? courseStats.averageMastery;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-muted/20 rounded-xl border border-border/30">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Çözülen
          </span>
          <span className="text-base font-bold text-foreground">
            {courseStats.totalQuestionsSolved}
          </span>
        </div>

        <div className="w-px h-8 bg-border/30" />

        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Başarı
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-emerald-500">
              {mastery}
            </span>
            {masteryDelta !== null && masteryDelta !== 0 && (
              <div
                className={`flex items-center gap-0.5 text-xs font-semibold ${
                  masteryDelta > 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {masteryDelta > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>
                  {masteryDelta > 0 ? '+' : ''}
                  {masteryDelta}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-right flex flex-col items-end gap-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          Soru
        </span>
        <div className="text-sm font-medium">
          {currentReviewIndex + 1} / {totalQueueLength ?? 0}
        </div>
        <QuizTimer
          key={currentQuestionId ?? 'timer'}
          isRunning={timerIsRunning}
        />
      </div>
    </div>
  );
};
