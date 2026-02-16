import { useState, useEffect } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/utils/core';
import { usePomodoro } from '@/features/pomodoro/hooks';

interface TimerDisplayProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  onClose: () => void;
  progress: number;
}

export function TimerDisplay({
  isExpanded,
  setIsExpanded,
  onClose,
  progress,
}: TimerDisplayProps) {
  const {
    mode,
    status,
    minutes,
    seconds,
    overtimeMinutes,
    overtimeSeconds,
    selectedCourse,
    isOvertime,
    pauseStartTime,
  } = usePomodoro();

  const [pauseDuration, setPauseDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pauseStartTime && status === 'paused') {
      interval = setInterval(() => {
        setPauseDuration(Math.floor((Date.now() - pauseStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pauseStartTime, status]);

  const isWorking = mode === 'work';

  if (!selectedCourse) return null;

  return (
    <div className="relative z-10 flex flex-col items-center w-full">
      <div className="w-full flex items-center justify-between px-5 pt-4 mb-2">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 max-w-[70%] cursor-pointer"
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isWorking
                ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]'
                : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
            )}
          />
          <span className="text-[13px] font-black text-foreground/90 tracking-normal uppercase leading-none">
            {selectedCourse.name}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'relative flex items-center justify-center cursor-pointer',
          isExpanded ? 'w-64 h-64' : 'w-40 h-40'
        )}
      >
        <svg
          className="w-full h-full transform -rotate-90 absolute"
          viewBox="0 0 224 224"
        >
          <circle
            cx="112"
            cy="112"
            r="100"
            stroke="currentColor"
            strokeWidth={isExpanded ? '6' : '8'}
            fill="transparent"
            className="text-secondary/50"
          />
          <circle
            cx="112"
            cy="112"
            r="100"
            stroke={
              isOvertime
                ? '#f97316'
                : isWorking
                  ? 'var(--color-primary)'
                  : '#10b981'
            }
            strokeWidth={isExpanded ? '6' : '8'}
            strokeDasharray={2 * Math.PI * 100}
            strokeDashoffset={
              2 * Math.PI * 100 * (isOvertime ? 0 : 1 - progress / 100)
            }
            strokeLinecap="round"
            fill="transparent"
            className="drop-shadow-lg"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <div className="flex flex-col items-center justify-center -translate-y-4">
            <span
              className={cn(
                'font-heading font-black tracking-tighter tabular-nums leading-none drop-shadow-sm',
                isExpanded ? 'text-6xl' : 'text-3xl',
                isOvertime ? 'text-orange-500' : 'text-foreground'
              )}
            >
              {minutes}:{seconds}
            </span>
            <div className="flex flex-col items-center justify-center h-0 relative">
              <div className="absolute top-1 whitespace-nowrap flex flex-col items-center">
                {isOvertime && (
                  <span className="text-orange-500 font-bold text-sm">
                    +{overtimeMinutes}:{overtimeSeconds}
                  </span>
                )}
                {status === 'paused' && pauseDuration > 0 && (
                  <span className="text-muted-foreground font-bold text-xs">
                    Duraklatma:{' '}
                    {Math.floor(pauseDuration / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(pauseDuration % 60).toString().padStart(2, '0')}
                  </span>
                )}
                {isExpanded && !isOvertime && (
                  <span
                    className={cn(
                      'text-[11px] font-black tracking-[0.3em] uppercase',
                      isWorking ? 'text-primary' : 'text-emerald-400'
                    )}
                  >
                    {isWorking ? 'ÇALIŞMA' : 'MOLA'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
