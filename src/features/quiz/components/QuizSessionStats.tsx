import React from 'react';
import { QuizTimer } from './QuizTimer';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface QuizSessionStatsProps {
  currentReviewIndex: number;
  totalQueueLength: number;
  timerIsRunning: boolean;
  currentQuestionId?: string;
  lastSubmissionResult?: {
    scoreDelta: number;
    newMastery: number;
  } | null;
}

export const QuizSessionStats: React.FC<QuizSessionStatsProps> = ({
  currentReviewIndex,
  totalQueueLength,
  timerIsRunning,
  currentQuestionId,
  lastSubmissionResult,
}) => {
  const masteryDelta = lastSubmissionResult?.scoreDelta ?? null;
  const mastery = lastSubmissionResult?.newMastery ?? 0;

  return (
    <div className="flex items-center justify-between px-6 md:px-10 py-3 md:py-4 border-b border-white/5 bg-transparent">
      <div className="flex items-center gap-6">
        <QuizTimer
          key={currentQuestionId ?? 'timer'}
          isRunning={timerIsRunning}
        />

        <div className="w-px h-8 bg-border/20 mx-2" />

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

      <div className="text-sm font-medium text-muted-foreground font-heading uppercase tracking-widest">
        Soru{' '}
        <span className="text-foreground">
          {Math.min(currentReviewIndex + 1, totalQueueLength)}
        </span>{' '}
        / {totalQueueLength}
      </div>
    </div>
  );
};
