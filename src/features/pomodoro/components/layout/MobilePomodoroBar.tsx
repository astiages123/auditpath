import { useState } from 'react';
import {
  Play,
  Pause,
  X,
  MoreHorizontal,
  Coffee,
  Target,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/stringHelpers';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';

// ===========================
// === PROPS DEFINITION ===
// ===========================

export interface MobilePomodoroBarProps {
  isWorking: boolean;
  status: string;
  progress: number;
  onFinishDay: () => void;
  onDiscard: () => void;
  onSwitchMode: () => void;
}

// ===========================
// === COMPONENT DEFINITION ===
// ===========================

export function MobilePomodoroBar({
  isWorking,
  status,
  progress,
  onFinishDay,
  onDiscard,
  onSwitchMode,
}: MobilePomodoroBarProps) {
  const { minutes, seconds, selectedCourse, start, pause } = usePomodoro();
  const [showActions, setShowActions] = useState(false);
  const isRunning = status === 'running';

  return (
    <div className="sm:hidden w-full pointer-events-auto relative">
      {/* Action Sheet */}
      <AnimatePresence>
        {showActions && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setShowActions(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full mb-2 left-0 right-0 mx-0 z-50"
            >
              <div
                className={cn(
                  'rounded-2xl border border-white/10 overflow-hidden shadow-2xl',
                  isWorking ? 'bg-emerald-950' : 'bg-amber-950'
                )}
              >
                <button
                  onClick={() => {
                    onSwitchMode();
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-4 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
                >
                  {isWorking ? (
                    <>
                      <Coffee className="w-4 h-4" /> Mola Ver
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4" /> Çalışmaya Dön
                    </>
                  )}
                </button>
                <div className="h-px bg-white/5" />
                <button
                  onClick={() => {
                    onFinishDay();
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-4 text-emerald-400 hover:bg-white/5 transition-colors text-sm font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4" /> Günü Bitir & Kaydet
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Pill */}
      <motion.div
        layout
        className={cn(
          'relative flex items-center gap-3 px-4 h-14 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden',
          'transition-colors duration-500',
          status === 'paused'
            ? 'bg-gray-800'
            : isWorking
              ? 'bg-emerald-950'
              : 'bg-amber-950'
        )}
      >
        {/* Progress line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5">
          <motion.div
            className={cn(
              'h-full',
              isWorking ? 'bg-primary' : 'bg-emerald-500'
            )}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Course name */}
        <span className="flex-1 min-w-0 text-xs font-bold text-white/70 truncate">
          {selectedCourse?.name}
        </span>

        {/* Timer */}
        <span
          className={cn(
            'font-mono font-black text-xl tabular-nums tracking-wider text-white shrink-0',
            status === 'paused' && 'opacity-60'
          )}
        >
          {minutes}:{seconds}
        </span>

        {/* Play/Pause */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={isRunning ? pause : start}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-xl shrink-0 transition-colors',
            isRunning ? 'bg-white/10 text-white' : 'bg-primary/80 text-white'
          )}
        >
          {isRunning ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" className="ml-0.5" />
          )}
        </motion.button>

        {/* More */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowActions(!showActions)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white/60 shrink-0"
        >
          <MoreHorizontal size={16} />
        </motion.button>

        {/* Close */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onDiscard}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white shrink-0"
        >
          <X size={15} />
        </motion.button>
      </motion.div>
    </div>
  );
}
