import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/stringHelpers';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';

export function TimerDisplay() {
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

  const [currentPauseDuration, setCurrentPauseDuration] =
    useState<string>('00:00');

  useEffect(() => {
    if (status !== 'paused' || !pauseStartTime) {
      return;
    }

    const updatePauseTimer = () => {
      const now = Date.now();
      const diffInSeconds = Math.floor((now - pauseStartTime) / 1000);
      const m = Math.floor(diffInSeconds / 60)
        .toString()
        .padStart(2, '0');
      const s = (diffInSeconds % 60).toString().padStart(2, '0');
      setCurrentPauseDuration(`${m}:${s}`);
    };

    updatePauseTimer();
    const interval = setInterval(updatePauseTimer, 1000);
    return () => {
      clearInterval(interval);
      setCurrentPauseDuration('00:00');
    };
  }, [status, pauseStartTime]);

  const isWorking = mode === 'work';

  if (!selectedCourse) return null;

  return (
    <>
      {/* === LEFT BLOCK: Context === */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="size-10 shrink-0 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center text-white">
          <Target size={20} />
        </div>
        <div className="flex flex-col min-w-0 pr-4">
          <span className="text-[10px] font-black uppercase text-white/90 tracking-widest leading-none mb-1">
            {isWorking ? 'ODAKLANMA' : 'MOLA'}
          </span>
          <span className="text-sm font-bold text-white truncate max-w-[160px] leading-tight">
            {selectedCourse.name}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-white/10 shrink-0" />

      {/* === CENTER BLOCK: Timer === */}
      <div className="flex items-center gap-4 shrink-0 px-2">
        {/* Timer digits */}
        <div className="flex items-center">
          <span
            className={cn(
              'font-mono font-bold text-4xl tabular-nums tracking-wider leading-none transition-colors duration-300',
              isOvertime
                ? 'text-white underline decoration-accent underline-offset-8'
                : 'text-white'
            )}
          >
            {minutes}
          </span>
          <span className="font-mono font-bold text-3xl mx-3 leading-none text-white/50">
            :
          </span>
          <span
            className={cn(
              'font-mono font-bold text-4xl tabular-nums tracking-wider leading-none transition-colors duration-300',
              isOvertime
                ? 'text-white underline decoration-accent underline-offset-8'
                : 'text-white'
            )}
          >
            {seconds}
          </span>
          {isOvertime && (
            <span className="ml-4 text-[10px] font-black text-white bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm">
              +{overtimeMinutes}:{overtimeSeconds}
            </span>
          )}
        </div>

        {/* Pause badge - expanded to show duration */}
        {status === 'paused' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-white/90 bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              DURAKLATILDI
            </div>
            <div className="text-sm font-black text-rose-400 tracking-widest">
              <span className="tabular-nums">{currentPauseDuration}</span>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
