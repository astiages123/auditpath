import { Play, Coffee, Pause } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { Session } from '../types/efficiencyTypes';

export type TimelineEvent = NonNullable<Session['timeline']>[number];

// --- Simple Gantt / Session Visualizer ---
export interface SessionGanttProps {
  sessions: Session[];
  detailed?: boolean;
}

export const SessionGanttChart = ({
  sessions,
  detailed = false,
}: SessionGanttProps) => {
  // If we have only one session, we might want to zoom, but let's stick to the robust logic
  // from DailyDetailedAnalysisModal which scans timelines for true boundaries.

  // 1. Calculate Global Boundaries from Timeline Events
  // This is critical because session.startTime might be "later" than actual work due to bugs
  let globalMin = Infinity;
  let globalMax = -Infinity;

  // Use a local helper to parse timeline safely
  const getEvents = (s: Session) => {
    if (!s.timeline || !Array.isArray(s.timeline) || s.timeline.length === 0)
      return [];
    return s.timeline;
  };

  sessions.forEach((s) => {
    // Default to session metadata
    let sStart = new Date(s.date + 'T' + s.startTime).getTime();
    // Note: s.date is YYYY-MM-DD, s.startTime is HH:mm.
    // BUT, better to trust the timeline if it exists.

    // If s.startTime is just HH:mm, we need to be careful with dates.
    // Let's rely purely on timestamp values in timeline if available.

    const events = getEvents(s);
    if (events.length > 0) {
      const tStart = Math.min(...events.map((e: TimelineEvent) => e.start));
      const tEnd = Math.max(
        ...events.map((e: TimelineEvent) => e.end || e.start)
      );
      if (tStart < Infinity) sStart = tStart;
      if (tEnd > -Infinity) {
        if (tEnd > globalMax) globalMax = tEnd;
      }
      if (sStart < globalMin) globalMin = sStart;
    } else {
      // Fallback to string parsing if no timeline
      // This is risky for "midnight crossing" but good enough for simple fallback
      // This is risky for "midnight crossing" but good enough for simple fallback
      const d = new Date(s.date);
      const [h, m] = s.startTime.split(':').map(Number);
      d.setHours(h, m, 0, 0);
      if (d.getTime() < globalMin) globalMin = d.getTime();

      const dEnd = new Date(d);
      dEnd.setMinutes(dEnd.getMinutes() + s.duration);
      if (dEnd.getTime() > globalMax) globalMax = dEnd.getTime();
    }
  });

  if (globalMin === Infinity) {
    // No data case
    globalMin = new Date().setHours(4, 0, 0, 0);
    globalMax = globalMin + 18 * 3600 * 1000;
  }

  // Add padding (30 mins before/after)
  const padding = 30 * 60 * 1000;
  const firstStart = globalMin - padding;
  const lastEnd = globalMax + padding;
  const totalSpan = lastEnd - firstStart;

  const getPos = (time: number) => ((time - firstStart) / totalSpan) * 100;

  // Generate markers
  const markers: number[] = [];
  const startTime = new Date(firstStart);
  startTime.setMinutes(0, 0, 0);
  // Add markers every 4 hours relative to the view
  for (let t = startTime.getTime(); t <= lastEnd; t += 3600000) {
    if (t >= firstStart) {
      const h = new Date(t).getHours();
      if (h % 4 === 0 || detailed) {
        if (detailed || h % 4 === 0) {
          markers.push(t);
        }
      }
    }
  }

  const getBlockStyles = (type: string) => {
    switch (type) {
      case 'work':
        return 'bg-emerald-900 border-emerald-800/50 text-emerald-200';
      case 'break':
        return 'bg-sky-900 border-sky-800/50 text-sky-200';
      case 'pause':
        return 'bg-zinc-900 border-zinc-800/50 text-zinc-200';
      default:
        return 'bg-primary/20 border-primary/40 text-primary';
    }
  };

  const ganttTooltipClass = cn(
    'tooltip-float',
    '-top-16 left-1/2 -translate-x-1/2 bg-surface border border-white/10 rounded-xl p-2.5 shadow-2xl z-50 pointer-events-none',
    'flex flex-col items-center gap-1 min-w-[140px] translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-200'
  );

  return (
    <div className="w-full h-full min-h-[160px] relative mt-2 select-none">
      {/* Time markers */}
      <div className="absolute top-0 bottom-0 left-0 right-0 flex justify-between pointer-events-none z-0">
        {markers.map((time) => {
          const pos = getPos(time);
          if (pos < 0 || pos > 100) return null;

          const dateObj = new Date(time);
          if (isNaN(dateObj.getTime())) return null;

          const timeLabel = dateObj.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={time}
              className="absolute inset-y-0 w-px border-r border-white/5 flex flex-col justify-end"
              style={{ left: `${pos}%` }}
            >
              <span className="absolute bottom-0 -translate-x-1/2 text-[10px] font-medium text-foreground whitespace-nowrap pb-1">
                {timeLabel}
              </span>
            </div>
          );
        })}
      </div>

      <div className="pt-10 pb-8 space-y-4 relative z-10">
        {sessions.map((session) => {
          let start = globalMin;
          let end = globalMax;

          const events = getEvents(session);

          if (events.length > 0) {
            start = Math.min(...events.map((e: TimelineEvent) => e.start));
            end = Math.max(
              ...events.map((e: TimelineEvent) => e.end || e.start)
            );
          } else {
            const d = new Date(session.date);
            const [h, m] = session.startTime.split(':').map(Number);
            d.setHours(h, m, 0, 0);
            start = d.getTime();
            end = start + session.duration * 60000;
          }

          const sessionLeft = getPos(start);
          const sessionWidth = getPos(end) - sessionLeft;

          return (
            <div key={session.id} className="relative h-10 w-full group/row">
              {/* Row Background Trace */}
              <div className="absolute inset-x-0 h-full bg-white/[0.02] rounded-lg -mx-2 group-hover/row:bg-white/[0.04] transition-colors" />

              {/* Blocks */}
              {events.length === 0 ? (
                <div
                  className="absolute h-full rounded-lg bg-primary/20 border border-primary/40 flex items-center px-3"
                  style={{
                    left: `${sessionLeft}%`,
                    width: `calc(${Math.max(0.5, sessionWidth)}% - 2px)`,
                  }}
                >
                  <span className="text-[10px] font-bold text-primary truncate">
                    {session.lessonName}
                  </span>
                </div>
              ) : (
                events.map(
                  (block: TimelineEvent, idx: number, arr: TimelineEvent[]) => {
                    const bStart = Math.max(start, block.start);
                    const bEnd = Math.min(
                      end,
                      block.end || (arr[idx + 1]?.start ?? end)
                    );

                    if (bStart >= bEnd) return null;

                    const bLeft = getPos(bStart);
                    const bWidth = getPos(bEnd) - bLeft;

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'absolute h-full rounded-md border flex items-center justify-center transition-all group hover:z-20 hover:scale-[1.02] hover:brightness-125 cursor-default',
                          getBlockStyles(block.type)
                        )}
                        style={{
                          left: `${bLeft}%`,
                          width: `calc(${Math.max(0.4, bWidth)}% - 1px)`,
                        }}
                      >
                        {/* Discrete Indicator Icons - Only if wide enough */}
                        {bWidth > 1 && (
                          <div className="group-hover:scale-110 transition-transform">
                            {block.type === 'work' ? (
                              <Play className="w-3 h-3 fill-current" />
                            ) : block.type === 'break' ? (
                              <Coffee className="w-3 h-3" />
                            ) : (
                              <Pause className="w-3 h-3 fill-current" />
                            )}
                          </div>
                        )}

                        {/* Premium Tooltip */}
                        <div className={ganttTooltipClass}>
                          <div className="flex items-center gap-2 w-full">
                            <div
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                block.type === 'work'
                                  ? 'bg-emerald-200'
                                  : block.type === 'break'
                                    ? 'bg-sky-200'
                                    : 'bg-zinc-200'
                              )}
                            />
                            <span className="font-bold text-[10px] tracking-widest uppercase opacity-80">
                              {block.type === 'work'
                                ? 'Odak'
                                : block.type === 'break'
                                  ? 'Mola'
                                  : 'Duraklatma'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between w-full border-t border-white/5 pt-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(bStart).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {new Date(bEnd).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="text-[10px] font-bold text-white ml-2">
                              {Math.round((bEnd - bStart) / 60000)} dk
                            </span>
                          </div>

                          {/* Tooltip Arrow */}
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border-r border-b border-white/10 rotate-45" />
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
