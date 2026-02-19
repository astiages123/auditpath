import { useEffect, useState, memo } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/utils/core';

interface QuizTimerProps {
  isRunning: boolean;
  className?: string;
}

export const QuizTimer = memo(function QuizTimer({
  isRunning,
  className,
}: Omit<QuizTimerProps, 'startTime'>) {
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isRunning]);

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
