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
import { StatisticsModal } from '@/features/statistics/components/modals/StatisticsModal';
import { SessionGanttChart } from '@/features/statistics/components/charts/SessionGanttChart';
import { StatsMetricCard } from '@/features/statistics/components/cards/StatsMetricCard';
import { formatDisplayDate } from '@/utils/dateUtils';

import type { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';
import type { Session } from '@/features/statistics/types/statisticsTypes';

const convertToSession = (recentSession: RecentSession): Session => {
  const start = new Date(recentSession.date);
  const end = new Date(start.getTime() + recentSession.durationMinutes * 60000);

  const timeline = ((recentSession.timeline as Record<string, unknown>[]) || [])
    .map((timelineEvent) => {
      const blockStart = timelineEvent.start
        ? new Date(timelineEvent.start as string | number | Date).getTime()
        : null;
      let blockEnd = timelineEvent.end
        ? new Date(timelineEvent.end as string | number | Date).getTime()
        : null;

      if (!blockStart || isNaN(blockStart)) return null;

      // If end is missing or invalid, default to start + 1 min or current time if it's the last event
      if (!blockEnd || isNaN(blockEnd)) {
        blockEnd = blockStart + 60000;
      }

      return {
        type: (timelineEvent.type as string)?.toLowerCase() || 'work',
        start: blockStart,
        end: blockEnd,
        duration: Math.round((blockEnd - blockStart) / 1000 / 60),
      };
    })
    .filter(
      (timelineEvent): timelineEvent is NonNullable<typeof timelineEvent> =>
        timelineEvent !== null
    );

  const pauseIntervals = timeline
    .filter((timelineEvent) => timelineEvent.type === 'pause')
    .map((timelineEvent) => ({
      start: new Date(timelineEvent.start).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      end: new Date(timelineEvent.end).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

  return {
    id: recentSession.id,
    lessonName: recentSession.courseName,
    date: start.toISOString().split('T')[0],
    startTime: start.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    endTime: end.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    duration: recentSession.durationMinutes,
    timeline: timeline,
    pauseIntervals,
  };
};

export interface SessionListItemProps {
  session: RecentSession;
  disableModal?: boolean;
}

export const SessionListItem: FC<SessionListItemProps> = ({
  session,
  disableModal = false,
}) => {
  const dateObj = new Date(session.date);
  const formattedDate = formatDisplayDate(dateObj, {
    day: 'numeric',
    month: 'long',
  });
  const formattedTime = dateObj.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getEfficiencyColor = (score: number) => {
    if (score >= 100) return 'text-emerald-400';
    if (score >= 70) return 'text-primary';
    if (score > 0) return 'text-rose-400';
    return 'text-muted-foreground';
  };

  const focusPower = session.efficiencyScore;
  const workMins = Math.round(session.totalWorkTime / 60);
  const breakMins = Math.round(session.totalBreakTime / 60);
  const pauseMins = Math.round(session.totalPauseTime / 60);

  const TriggerContent = (
    <button
      type="button"
      className="p-4 w-full flex items-center justify-between bg-white/2 border border-white/5 hover:bg-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
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
          <span className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-tighter mb-0.5">
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
    </button>
  );

  if (disableModal) {
    return <div className="w-full">{TriggerContent}</div>;
  }

  return (
    <StatisticsModal
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
          <StatsMetricCard
            icon={LayoutGrid}
            iconBg="bg-accent/10"
            iconColor="text-accent"
            label="Durdurma"
            value={`${session.pauseCount} Adet`}
          />
          <StatsMetricCard
            icon={Zap}
            iconBg="bg-accent/10"
            iconColor="text-accent"
            label="Odaklanma"
            value={`${workMins} dk`}
          />
          <StatsMetricCard
            icon={Coffee}
            iconBg="bg-accent/10"
            iconColor="text-accent"
            label="Mola"
            value={`${breakMins} dk`}
          />
          <StatsMetricCard
            icon={PauseIcon}
            iconBg="bg-accent/10"
            iconColor="text-accent"
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
          <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-700 rounded-full',
                focusPower >= 100
                  ? 'bg-emerald-500'
                  : focusPower >= 70
                    ? 'bg-primary'
                    : 'bg-rose-500'
              )}
              style={{ width: `${Math.min(100, focusPower)}%` }}
            />
          </div>
        </div>
      </div>
    </StatisticsModal>
  );
};
