import { useMemo } from 'react';
import { Target, Maximize2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal } from './EfficiencyModal';
import { FocusStreamHub as FocusHubContent } from './FocusStreamHub';
import { GoalProgressRing } from './GoalProgressRing';
import { Session } from '../types/efficiencyTypes';
import { CardHeader, TrendBadge } from './CardElements';
import { getFlowColor, getFlowStatusLabel } from '../logic/flowStateConfig';
import { cn } from '@/utils/stringHelpers';
import { useDailyMetrics } from '../hooks/useDailyMetrics';
import { useEfficiencyTrends } from '../hooks/useEfficiencyTrends';
import { useEfficiencyLogic } from '../hooks/useEfficiency';
import { DAILY_GOAL_MINUTES as DEFAULT_DAILY_GOAL_MINUTES } from '../utils/constants';

export const FocusHubCard = () => {
  const {
    loading: loadingDaily,
    efficiencySummary,
    dailyGoalMinutes,
    todayVideoMinutes,
    todayVideoCount,
    videoTrendPercentage,
    trendPercentage,
  } = useDailyMetrics();

  const { loading: loadingTrends, efficiencyTrend } = useEfficiencyTrends();

  const loading = loadingDaily || loadingTrends;

  const currentWorkMinutes = Math.round(
    (efficiencySummary?.netWorkTimeSeconds || 0) / 60
  );

  const logic = useEfficiencyLogic({
    totalVideoTime: todayVideoMinutes,
    totalPomodoroTime: currentWorkMinutes,
  });

  const { learningFlow, flowState, goalProgress } = logic;

  // Transform sessions for the modal
  const sessions: Session[] = useMemo(() => {
    if (!efficiencySummary?.sessions) return [];

    return efficiencySummary.sessions.map((s: unknown) => {
      const session = s as {
        id: string;
        startedAt: string;
        courseName?: string;
        workTimeSeconds: number;
        breakTimeSeconds: number;
        pauseTimeSeconds: number;
        timeline?: Array<{
          type?: string;
          start: string | number;
          end: string | number;
        }>;
      };
      const startDate = new Date(session.startedAt);
      const totalDurationSec =
        session.workTimeSeconds +
        session.breakTimeSeconds +
        session.pauseTimeSeconds;
      const endDate = new Date(startDate.getTime() + totalDurationSec * 1000);

      const rawTimeline = (
        Array.isArray(session.timeline) ? session.timeline : []
      ) as {
        type?: string;
        start: string | number;
        end: string | number;
      }[];
      const timeline = rawTimeline.map((item) => ({
        type: item.type?.toLowerCase() || 'work',
        start: Number(item.start),
        end: Number(item.end),
        duration: Math.round(
          (Number(item.end) - Number(item.start)) / 1000 / 60
        ),
      }));

      const pauseIntervals = timeline
        .filter((t) => t.type === 'pause')
        .map((t) => ({
          start: new Date(t.start).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          end: new Date(t.end).toLocaleTimeString('tr-TR', {
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
        timeline,
        pauseIntervals,
      };
    });
  }, [efficiencySummary]);

  const dailyGoal = dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES;

  if (loading)
    return (
      <Card className="h-full flex flex-col p-4 md:p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl bg-surface" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-surface" />
              <Skeleton className="h-3 w-48 bg-surface" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 mt-6">
          <Skeleton className="h-40 w-40 rounded-full bg-surface shrink-0" />
          <div className="space-y-4 w-full md:w-auto flex flex-col items-center md:items-start">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 bg-surface" />
              <Skeleton className="h-10 w-48 bg-surface" />
            </div>
            <div className="space-y-2 w-full">
              <Skeleton className="h-16 w-full md:w-48 bg-surface rounded-lg" />
              <Skeleton className="h-16 w-full md:w-48 bg-surface rounded-lg" />
            </div>
          </div>
        </div>
      </Card>
    );

  return (
    <EfficiencyModal
      title="Öğrenme Akışı Analizi"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <Card className="h-full flex flex-col p-4 md:p-6">
            <CardHeader
              icon={Target}
              iconColor="text-accent"
              iconBg="bg-accent/10"
              title="Öğrenme Akışı"
              subtitle="Video hızı ve çalışma süresi oranı. İdeal: 1.0x"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />

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
                        'text-3xl md:text-4xl font-bold font-heading',
                        getFlowColor(flowState)
                      )}
                    >
                      {learningFlow.toFixed(2)}x
                    </p>
                    <p
                      className={cn(
                        'text-[11px] font-bold tracking-wide lowercase',
                        getFlowColor(flowState),
                        'opacity-90'
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
                        video
                      </span>
                    </p>
                    <p className="text-[12px] text-muted-foreground/60">
                      {todayVideoMinutes} dk toplam
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      }
    >
      <FocusHubContent trendData={efficiencyTrend} sessions={sessions} />
    </EfficiencyModal>
  );
};
