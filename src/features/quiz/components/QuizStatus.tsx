import React, { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/utils/stringHelpers';
import { cleanMathContent } from '@/features/quiz/utils/mathUtils';

// ============================================================================
// Timer & Progress Components (formerly in QuizProgress.tsx)
// ============================================================================

import { useQuizTimerStore } from '@/features/quiz/store';

interface QuizTimerProps {
  isRunning: boolean;
  className?: string;
}

export const QuizTimer = memo(function QuizTimer({
  isRunning,
  className,
}: QuizTimerProps) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor(useQuizTimerStore.getState().getTime() / 1000)
  );

  useEffect(() => {
    const updateTime = () => {
      setElapsed(Math.floor(useQuizTimerStore.getState().getTime() / 1000));
    };

    updateTime();

    if (!isRunning) return;

    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-primary tabular-nums',
        className
      )}
    >
      <Clock className="w-5 h-5" />
      <span className="text-xl font-semibold font-heading">{timeString}</span>
    </div>
  );
});

interface ProgressDotsProps {
  progressQueue: string[];
  progressIndex: number;
  questionResults: Record<string, 'correct' | 'incorrect' | 'blank'>;
  selectedAnswer: number | null;
}

export const ProgressDots: React.FC<ProgressDotsProps> = ({
  progressQueue,
  progressIndex,
  questionResults,
  selectedAnswer,
}) => {
  return (
    <div className="flex items-center gap-3">
      {progressQueue.map((id, idx) => {
        const result = questionResults[id];
        const isActive = idx === progressIndex;

        let dotColor = 'bg-white/10';
        if (result === 'correct') dotColor = 'bg-primary';
        else if (result === 'incorrect') dotColor = 'bg-red-500';

        if (isActive) {
          return (
            <div
              key={id}
              className={`w-2 h-2 rounded-full ${
                result
                  ? dotColor
                  : selectedAnswer !== null
                    ? 'bg-primary/60'
                    : 'bg-white/40'
              } transition-all duration-300 scale-150 shadow-lg ${
                !result && 'animate-pulse'
              }`}
            ></div>
          );
        }

        return (
          <div
            key={id}
            className={`w-2 h-2 rounded-full ${dotColor} transition-all duration-300`}
          ></div>
        );
      })}
    </div>
  );
};

interface QuizProgressProps {
  currentReviewIndex: number;
  totalQueueLength: number;
  timerIsRunning: boolean;
  currentQuestionId?: string;
  lastSubmissionResult?: {
    scoreDelta: number;
    newMastery: number;
  } | null;
  progressQueue?: string[];
  questionResults?: Record<string, 'correct' | 'incorrect' | 'blank'>;
  selectedAnswer?: number | null;
}

export const QuizProgress: React.FC<QuizProgressProps> = ({
  currentReviewIndex,
  totalQueueLength,
  timerIsRunning,
  currentQuestionId,
  lastSubmissionResult,
  progressQueue = [],
  questionResults = {},
  selectedAnswer = null,
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

        {progressQueue.length > 0 && (
          <>
            <div className="w-px h-8 bg-border/20 mx-2" />
            <ProgressDots
              progressQueue={progressQueue}
              progressIndex={currentReviewIndex}
              questionResults={questionResults}
              selectedAnswer={selectedAnswer}
            />
          </>
        )}
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

// ============================================================================
// Status Overlay Views (formerly in QuizStatusViews.tsx)
// ============================================================================

interface QuizLoadingViewProps {
  isLoading: boolean;
  generatedCount: number;
  totalToGenerate: number;
}

export const QuizLoadingView: React.FC<QuizLoadingViewProps> = ({
  isLoading,
  generatedCount,
  totalToGenerate,
}) => (
  <div className="text-center py-12 space-y-4">
    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
    <div className="space-y-1">
      <h3 className="text-lg font-medium text-white">
        {isLoading ? 'Sorular Hazırlanıyor...' : 'Oturum Hazırlanıyor...'}
      </h3>
      {isLoading && totalToGenerate > 0 && (
        <p className="text-muted-foreground">
          {generatedCount} / {totalToGenerate} tamamlanıyor
        </p>
      )}
    </div>
  </div>
);

interface QuizReadyViewProps {
  onStart: () => void;
  currentBatchIndex: number;
  totalBatches: number;
  generatedCount: number;
}

export const QuizReadyView: React.FC<QuizReadyViewProps> = ({
  onStart,
  currentBatchIndex,
  totalBatches,
  generatedCount,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-12 space-y-6"
  >
    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto ring-1 ring-primary/50">
      <ArrowRight className="w-8 h-8 text-primary" />
    </div>
    <div className="space-y-2">
      <h3 className="text-2xl font-bold text-white">Hazır mısın?</h3>
      <p className="text-muted-foreground max-w-sm mx-auto">
        {totalBatches > 1
          ? `${currentBatchIndex + 1}. Set başlıyor. (${generatedCount} Soru)`
          : `${generatedCount} adet antrenman sorusu hazırlandı.`}
      </p>
    </div>
    <button
      onClick={onStart}
      className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25"
    >
      Antrenmanı Başlat
    </button>
  </motion.div>
);

interface QuizErrorViewProps {
  error: string;
  onRetry: () => void;
}

export const QuizErrorView: React.FC<QuizErrorViewProps> = ({
  error,
  onRetry,
}) => (
  <div className="text-center py-12 space-y-4">
    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
      <RotateCcw className="w-6 h-6 text-red-500" />
    </div>
    <div className="space-y-1">
      <h3 className="text-lg font-medium text-red-500">Oturum Hatası</h3>
      <p className="text-muted-foreground max-w-sm mx-auto">{error}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
      >
        Tekrar Dene
      </button>
    </div>
  </div>
);

// ============================================================================
// Math Renderer (formerly QuizMathRenderer.tsx)
// ============================================================================

const remarkPlugins = [remarkMath];
const rehypePlugins = [rehypeKatex];
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <span className="inline">{children}</span>
  ),
};

interface MathRendererProps {
  content: string;
}

export const MathRenderer = memo(function MathRenderer({
  content,
}: MathRendererProps) {
  const cleanContent = cleanMathContent(content);

  return (
    <div className="math-rendering upright-math">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
});
