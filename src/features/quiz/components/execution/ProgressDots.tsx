import React from 'react';

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
