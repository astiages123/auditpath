import { Play, Pause, Coffee, Briefcase, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { Button } from '@/components/ui/button';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';

interface TimerControlsProps {
  isExpanded: boolean;
  onSwitchMode: () => void;
  onFinishDay: () => void;
}

export function TimerControls({
  isExpanded,
  onSwitchMode,
  onFinishDay,
}: TimerControlsProps) {
  const { mode, status, start, pause, sessionCount } = usePomodoro();

  const isWorking = mode === 'work';
  const isRunning = status === 'running';

  return (
    <div className="relative z-10 flex flex-col items-center w-full">
      <div
        className={cn(
          'w-full flex flex-col gap-3 px-6 pb-6 pt-2',
          !isExpanded && 'px-4 pb-4 pt-1'
        )}
      >
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={isRunning ? pause : start}
            className={cn(
              'flex items-center justify-center rounded-2xl shadow-xl group w-full',
              isExpanded ? 'h-14' : 'h-11',
              isRunning
                ? 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                : isWorking
                  ? 'bg-primary text-primary-foreground hover:bg-primary/95'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
            )}
          >
            {isRunning ? (
              <Pause
                size={isExpanded ? 20 : 16}
                fill="currentColor"
                className="mr-2"
              />
            ) : (
              <Play
                size={isExpanded ? 20 : 16}
                fill="currentColor"
                className="mr-2"
              />
            )}
            <span
              className={cn(
                'font-black tracking-tight',
                isExpanded ? 'text-base' : 'text-xs'
              )}
            >
              {isRunning ? 'DURAKLAT' : 'BAŞLAT'}
            </span>
          </button>
          {isExpanded && (
            <div className="flex gap-2 w-full">
              <Button
                variant="ghost"
                onClick={onSwitchMode}
                className={cn(
                  'h-12 flex-1 rounded-xl gap-2 text-sm font-black',
                  isWorking
                    ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                    : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                )}
              >
                {isWorking ? <Coffee size={18} /> : <Briefcase size={18} />}
                <span>{isWorking ? 'Mola' : 'Çalış'}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={onFinishDay}
                className="h-12 flex-1 rounded-xl gap-2 text-sm font-black bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                <CheckCircle2 size={18} />
                <span>Günü Bitir</span>
              </Button>
            </div>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="w-full px-5 pb-4 flex items-center justify-center text-[10px] font-black text-primary uppercase tracking-[0.3em] border-t border-primary/10 pt-4">
          <span className="bg-primary/10 px-3 py-1 rounded-full">
            OTURUM {sessionCount}
          </span>
        </div>
      )}
    </div>
  );
}
