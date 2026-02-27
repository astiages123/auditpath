import { Play, Pause, Coffee, Target, CheckCircle2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/stringHelpers';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';

interface TimerControlsProps {
  isExpanded: boolean;
  onSwitchMode: () => void;
  onFinishDay: () => void;
  onDiscard: () => void;
}

export function TimerControls({
  onSwitchMode,
  onFinishDay,
  onDiscard,
}: TimerControlsProps) {
  const { mode, status, start, pause, sessionCount } = usePomodoro();

  const isWorking = mode === 'work';
  const isRunning = status === 'running';

  return (
    <>
      {/* Divider */}
      <div className="h-8 w-px bg-white/10 shrink-0" />

      {/* === RIGHT BLOCK: Actions === */}
      <div className="flex items-center gap-5 shrink-0">
        {/* Session Counter */}
        <div className="flex flex-col items-center justify-center w-12 text-center">
          <span className="text-xs font-black text-foreground/90 uppercase leading-none mb-1.5">
            OTURUM
          </span>
          <span className="text-base font-black text-foreground/90 leading-none tabular-nums">
            {sessionCount}
          </span>
        </div>

        <div className="h-8 w-px bg-white/5" />

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {/* Play / Pause */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={isRunning ? pause : start}
            className={cn(
              'size-10 flex items-center justify-center rounded-xl transition-all duration-200',
              isRunning
                ? 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
                : 'bg-primary/70 text-muted'
            )}
          >
            {isRunning ? (
              <Pause size={17} fill="currentColor" />
            ) : (
              <Play size={17} fill="currentColor" className="ml-0.5" />
            )}
          </motion.button>

          {/* Break / Work Mode */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onSwitchMode}
            title={isWorking ? 'Mola Ver' : 'Çalışmaya Dön'}
            className="size-10 flex items-center justify-center rounded-xl bg-white/5 text-white/60 border border-white/5 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            {isWorking ? <Coffee size={17} /> : <Target size={17} />}
          </motion.button>

          {/* Finish Day */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onFinishDay}
            title="Günü Bitir"
            className="size-10 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/10 hover:bg-destructive/20 transition-all duration-200"
          >
            <CheckCircle2 size={17} />
          </motion.button>

          {/* Direct Close (No Save) */}
          <div className="h-6 w-px bg-foreground/50 mx-1" />
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onDiscard}
            title="Kaydetmeden Kapat"
            className="size-10 flex items-center justify-center rounded-xl text-white hover:bg-destructive/15 hover:text-destructive transition-all duration-200"
          >
            <X
              size={18}
              strokeWidth={2.5}
              className="transition-colors duration-200"
            />
          </motion.button>
        </div>
      </div>
    </>
  );
}
