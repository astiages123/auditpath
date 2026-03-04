import { useMemo } from 'react';
import { Target, Maximize2 } from 'lucide-react';

import { StatisticsCard } from '@/features/efficiency/components/cards/StatisticsCard';
import { cn } from '@/utils/stringHelpers';

import { TrendBadge } from '@/features/efficiency/components/shared/CardElements';
import { EfficiencyModal } from '@/features/efficiency/components/modals/EfficiencyModal';
import { FocusStreamHub as FocusHubContent } from '@/features/efficiency/components/content/FocusStreamHub';
import { GoalProgressRing } from '@/features/efficiency/components/shared/GoalProgressRing';
import {
  getFlowColor,
  getFlowStatusLabel,
} from '@/features/efficiency/logic/flowStateConfig';
import { useEfficiencyLogic } from '@/features/efficiency/hooks/useEfficiency';
import type { DailyMetrics } from '@/features/efficiency/hooks/useDailyMetrics';
import { DAILY_GOAL_MINUTES as DEFAULT_DAILY_GOAL_MINUTES } from '@/features/efficiency/utils/constants';
import type {
  DetailedSession,
  EfficiencyTrend,
  Session,
} from '@/features/efficiency/types/efficiencyTypes';

type TimelineEvent = NonNullable<Session['timeline']>[number];

// ==========================================
// === TYPES / PROPS ===
// ==========================================

export interface FocusHubCardProps {
  dailyMetrics: Omit<DailyMetrics, 'loading'>;
  efficiencyTrend: EfficiencyTrend[];
}

// ==========================================
// === COMPONENT ===
// ==========================================

export const FocusHubCard = ({
  dailyMetrics,
  efficiencyTrend,
}: FocusHubCardProps) => {
  // ==========================================
  // === DERIVED STATE ===
  // ==========================================
  const {
    efficiencySummary,
    dailyGoalMinutes,
    todayVideoMinutes,
    todayReadingMinutes,
    todayVideoCount,
    pagesRead,
    videoTrendPercentage,
    trendPercentage,
  } = dailyMetrics;

  const currentWorkMinutes = Math.round(
    (efficiencySummary?.netWorkTimeSeconds || 0) / 60
  );

  const logic = useEfficiencyLogic({
    totalVideoTime: todayVideoMinutes,
    totalReadingTime: todayReadingMinutes,
    totalPomodoroTime: currentWorkMinutes,
  });

  const { learningFlow, flowState, goalProgress } = logic;

  // Transform sessions for the modal view into a format expected by FocusStreamHub
  const sessions: Session[] = useMemo(() => {
    if (
      !efficiencySummary?.sessions ||
      !Array.isArray(efficiencySummary.sessions)
    )
      return [];

    return efficiencySummary.sessions.map((session: DetailedSession) => {
      const startDate = new Date(session.startedAt);
      const totalDurationSec =
        session.workTimeSeconds +
        session.breakTimeSeconds +
        session.pauseTimeSeconds;

      const endDate = new Date(startDate.getTime() + totalDurationSec * 1000);

      const rawTimeline = Array.isArray(session.timeline)
        ? session.timeline
        : [];

      const timeline: TimelineEvent[] = rawTimeline.map((item) => ({
        type:
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          typeof item.type === 'string'
            ? (item.type.toLowerCase() as 'work' | 'break' | 'pause')
            : 'work',
        start:
          typeof item === 'object' &&
          item !== null &&
          'start' in item &&
          typeof item.start === 'number'
            ? item.start
            : 0,
        end:
          typeof item === 'object' &&
          item !== null &&
          'end' in item &&
          typeof item.end === 'number'
            ? item.end
            : 0,
        duration: Math.round(
          ((typeof item === 'object' &&
          item !== null &&
          'end' in item &&
          typeof item.end === 'number'
            ? item.end
            : 0) -
            (typeof item === 'object' &&
            item !== null &&
            'start' in item &&
            typeof item.start === 'number'
              ? item.start
              : 0)) /
            1000 /
            60
        ),
      }));

      const normalizedTimeline = timeline.map((timelineItem) => ({
        ...timelineItem,
        type: (timelineItem.type || 'work') as 'work' | 'break' | 'pause',
      }));

      const pauseIntervals = normalizedTimeline
        .filter((t) => t.type === 'pause')
        .map((t) => ({
          start: new Date(t.start).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          end: new Date(t.end || Date.now()).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }));

      return {
        id: session.id,
        lessonName: session.courseName || 'Genel Çalışma',
        date: startDate.toISOString().split('T')[0],
        startTime: startDate.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        endTime: endDate.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        duration: Math.round(session.workTimeSeconds / 60),
        timeline: normalizedTimeline,
        pauseIntervals,
      };
    });
  }, [efficiencySummary]);

  const dailyGoal = dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES;

  // ==========================================
  // === RENDER ===
  // ==========================================
  return (
    <EfficiencyModal
      title="Öğrenme Akışı Analizi"
      trigger={
        <StatisticsCard
          title="Öğrenme Akışı"
          subtitle="İçerik tamamlama hızı ve çalışma süresi oranı. İdeal: 1.0x"
          tooltip="Belirlenen sürede bitirmen gereken içerik ile bitirdiğin içerik arasındaki orandır. 1.0x her şeyin yolunda olduğunu gösterir."
          icon={Target}
          action={
            <Maximize2 className="w-5 h-5 text-muted-foreground/30 group-hover:text-white transition-colors" />
          }
        >
          <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-5 mt-4 md:gap-8 md:mt-6">
            <GoalProgressRing
              progress={goalProgress}
              size={160}
              strokeWidth={12}
            />

            <div className="text-center md:text-left space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  Öğrenme Akışı
                </p>
                <div className="flex flex-col md:flex-row md:items-baseline gap-x-3 gap-y-1 justify-center md:justify-start">
                  <p
                    className={cn(
                      'text-xl md:text-2xl font-bold font-heading',
                      getFlowColor(flowState)
                    )}
                  >
                    {learningFlow.toFixed(2)}x
                  </p>
                  <p
                    className={cn(
                      'text-xs font-bold tracking-wide lowercase whitespace-nowrap',
                      getFlowColor(flowState)
                    )}
                  >
                    {getFlowStatusLabel(flowState)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Günlük Odak
                    </p>
                    <TrendBadge percentage={trendPercentage} />
                  </div>
                  <p className="text-lg font-mono text-white">
                    {currentWorkMinutes}
                    <span className="text-muted-foreground/40 text-sm">
                      {' '}
                      / {dailyGoal}dk
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Video İzleme
                    </p>
                    <TrendBadge percentage={videoTrendPercentage} />
                  </div>
                  <p className="text-lg font-mono text-white">
                    {todayVideoCount}
                    <span className="text-muted-foreground/40 text-sm">
                      {' '}
                      içerik
                    </span>
                  </p>
                  <p className="text-[12px] text-muted-foreground/60 leading-tight">
                    {todayVideoMinutes + todayReadingMinutes} dk toplam
                    {pagesRead > 0 && (
                      <span className="block italic text-emerald-400/80">
                        ({pagesRead} sayfa)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </StatisticsCard>
      }
    >
      <FocusHubContent trendData={efficiencyTrend} sessions={sessions} />
    </EfficiencyModal>
  );
};
