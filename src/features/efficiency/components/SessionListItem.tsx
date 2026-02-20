import { FC } from 'react';
import {
  BookOpen,
  ChevronRight,
  Zap,
  Coffee,
  Pause as PauseIcon,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { calculateFocusPower } from '@/features/efficiency/logic/metricsCalc';
import { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';
import { Session } from '../types/efficiencyTypes';
import { EfficiencyModal } from './EfficiencyModal';
import { SessionGanttChart } from './SessionGanttChart';
import { StatCard } from './StatCard';

const convertToSession = (rs: RecentSession): Session => {
  const start = new Date(rs.date);
  const end = new Date(start.getTime() + rs.durationMinutes * 60000);

  const timeline = (
    rs.timeline as {
      type: string;
      start: string | number;
      end: string | number;
    }[]
  ).map((t) => {
    const bStart = new Date(t.start).getTime();
    const bEnd = new Date(t.end).getTime();
    return {
      type: t.type || 'work',
      start: bStart,
      end: bEnd,
      duration: Math.round((bEnd - bStart) / 1000 / 60),
    };
  });

  return {
    id: rs.id,
    lessonName: rs.courseName,
    date: start.toISOString().split('T')[0],
    startTime: start.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    endTime: end.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    duration: rs.durationMinutes,
    timeline: timeline,
    pauseIntervals: [],
  };
};

interface SessionListItemProps {
  session: RecentSession;
  disableModal?: boolean;
}

export const SessionListItem: FC<SessionListItemProps> = ({
  session,
  disableModal = false,
}) => {
  const dateObj = new Date(session.date);
  const formattedDate = dateObj.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
  });
  const formattedTime = dateObj.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getEfficiencyColor = (score: number) => {
    if (score >= 100) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    if (score > 0) return 'text-rose-400';
    return 'text-muted-foreground';
  };

  const focusPower = calculateFocusPower(
    session.totalWorkTime,
    session.totalBreakTime,
    session.totalPauseTime
  );

  const TriggerContent = (
    <div className="p-4 flex items-center justify-between bg-white/2 border border-white/5 hover:bg-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="text-left flex flex-col gap-0.5">
          <h4 className="text-base font-medium text-white/90 leading-tight">
            {session.courseName}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <span>{formattedDate}</span>
            <span className="text-muted-foreground/30">•</span>
            <span>{formattedTime}</span>
            <span className="text-muted-foreground/30">•</span>
            <span>{session.durationMinutes} dk</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter mb-0.5">
            Odak Gücü
          </span>
          <span
            className={cn(
              'text-base font-semibold',
              getEfficiencyColor(focusPower)
            )}
          >
            {focusPower}
          </span>
        </div>
        {!disableModal && (
          <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-white/60 transition-colors" />
        )}
      </div>
    </div>
  );

  if (disableModal) {
    return <div className="w-full">{TriggerContent}</div>;
  }

  const workMins = Math.round(session.totalWorkTime / 60);
  const breakMins = Math.round(session.totalBreakTime / 60);
  const pauseMins = Math.round(session.totalPauseTime / 60);

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-full">
      <EfficiencyModal
        title={`${session.courseName} - Oturum Detayı`}
        trigger={TriggerContent}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Oturum Akışı
            </h5>
            <div className="bg-white/3 p-5 rounded-xl border border-white/5">
              <SessionGanttChart
                sessions={[convertToSession(session)]}
                detailed={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={LayoutGrid}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              label="Durdurma"
              value={`${session.pauseCount} Adet`}
            />
            <StatCard
              icon={Zap}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-400"
              label="Odaklanma"
              value={`${workMins} dk`}
            />
            <StatCard
              icon={Coffee}
              iconBg="bg-sky-500/10"
              iconColor="text-sky-400"
              label="Mola"
              value={`${breakMins} dk`}
            />
            <StatCard
              icon={PauseIcon}
              iconBg="bg-zinc-500/10"
              iconColor="text-zinc-400"
              label="Duraklatma"
              value={`${pauseMins} dk`}
            />
          </div>

          <div className="bg-white/3 rounded-xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Odak Gücü
              </span>
              <span
                className={cn(
                  'text-xl font-bold',
                  getEfficiencyColor(focusPower)
                )}
              >
                {focusPower}{' '}
                <span className="text-xs font-medium opacity-50 uppercase tracking-normal">
                  puan
                </span>
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-700 rounded-full',
                  focusPower >= 100
                    ? 'bg-emerald-500'
                    : focusPower >= 70
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                )}
                style={{ width: `${Math.min(100, focusPower)}%` }}
              />
            </div>
          </div>
        </div>
      </EfficiencyModal>
    </div>
  );
};
