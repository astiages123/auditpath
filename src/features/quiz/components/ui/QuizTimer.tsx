import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/shared/lib/core/utils';

interface QuizTimerProps {
  isRunning: boolean;
  className?: string;
}

export function QuizTimer({
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
        'flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg text-sm font-medium tabular-nums',
        className
      )}
    >
      <Clock className="w-4 h-4 text-muted-foreground" />
      <span className="text-foreground">{timeString}</span>
    </div>
  );
}
