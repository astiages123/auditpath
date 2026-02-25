import {
  AlertCircle,
  Clock,
  ZapOff,
  TrendingDown,
  Info,
  Timer,
} from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { calculateFocusPower } from '@/features/efficiency/logic/metricsCalc';
import { Session } from '../types/efficiencyTypes';

interface DistractionDetailsProps {
  sessions: Session[];
}

interface TimelineEvent {
  type: 'pause' | 'break' | string;
  start: number;
  duration?: number;
}

interface TimelinePause extends TimelineEvent {
  lessonName?: string;
  timeLabel?: string;
}

export const DistractionDetails = ({ sessions }: DistractionDetailsProps) => {
  const totalPauses = sessions.reduce((acc, s) => {
    const pauseEvents =
      s.timeline?.filter((t: TimelineEvent) => t.type === 'pause') || [];
    return acc + pauseEvents.length;
  }, 0);

  const totalPauseMinutes = sessions.reduce((acc, s) => {
    const pauseEvents =
      s.timeline?.filter((t: TimelineEvent) => t.type === 'pause') || [];
    const pauseMins = pauseEvents.reduce(
      (pAcc: number, p: TimelineEvent) => pAcc + (p.duration || 0),
      0
    );
    return acc + pauseMins;
  }, 0);

  const totalBreakMinutes = sessions.reduce((acc, s) => {
    const breakEvents =
      s.timeline?.filter((t: TimelineEvent) => t.type === 'break') || [];
    const breakMins = breakEvents.reduce(
      (pAcc: number, p: TimelineEvent) => pAcc + (p.duration || 0),
      0
    );
    return acc + breakMins;
  }, 0);

  const totalWorkMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);

  const focusPower = calculateFocusPower(
    totalWorkMinutes * 60,
    totalBreakMinutes * 60,
    totalPauseMinutes * 60
  );

  const getStabilityColor = (score: number) => {
    if (score >= 100) return 'text-emerald-400';
    if (score >= 70) return 'text-primary';
    return 'text-rose-400';
  };

  const allPauses = sessions
    .flatMap((s) =>
      (s.timeline?.filter((t: TimelineEvent) => t.type === 'pause') || []).map(
        (p: TimelineEvent): TimelinePause => ({
          ...p,
          lessonName: s.lessonName,
          timeLabel: new Date(p.start).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })
      )
    )
    .sort((a, b) => b.start - a.start);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border-subtle p-5 rounded-2xl flex flex-col items-center text-center">
          <div className="p-3 bg-violet-500/10 rounded-xl mb-3">
            <Timer className="w-5 h-5 text-violet-400" />
          </div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">
            Odak Gücü
          </span>
          <span
            className={cn(
              'text-2xl font-black font-heading',
              getStabilityColor(focusPower)
            )}
          >
            {focusPower}{' '}
            <span className="text-xs font-medium opacity-50">puan</span>
          </span>
        </div>

        <div className="bg-surface border border-border-subtle p-5 rounded-2xl flex flex-col items-center">
          <div className="p-3 bg-primary/10 rounded-xl mb-3">
            <ZapOff className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">
            Toplam Duraklatma
          </span>
          <span className="text-2xl font-black font-heading text-white">
            {totalPauses}{' '}
            <span className="text-sm font-medium text-muted-foreground">
              kez
            </span>
          </span>
        </div>

        <div className="bg-surface border border-border-subtle p-5 rounded-2xl flex flex-col items-center">
          <div className="p-3 bg-rose-500/10 rounded-xl mb-3">
            <Clock className="w-5 h-5 text-rose-400" />
          </div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">
            Kayıp Zaman
          </span>
          <span className="text-2xl font-black font-heading text-white">
            {totalPauseMinutes}{' '}
            <span className="text-sm font-medium text-muted-foreground">
              dk
            </span>
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <AlertCircle className="w-4 h-4 text-primary/60" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Duraklatma Günlüğü
          </h4>
        </div>

        {allPauses.length > 0 ? (
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {allPauses.map((pause, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 bg-white/3 border border-white/5 rounded-xl hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_8px_oklch(63.68%_0.2078_25.3313/0.4)]" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white/90">
                      {pause.lessonName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {pause.timeLabel} civarında
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-rose-400">
                    {pause.duration} dk
                  </span>
                  <TrendingDown className="w-3.5 h-3.5 text-muted-foreground/30" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-white/2 border border-dashed border-border-subtle">
            <Info className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Bugün henüz bir duraklatma kaydedilmedi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
