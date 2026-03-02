import { lazy, Suspense } from 'react';
import { BookOpen, Maximize2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal } from './EfficiencyModal';
import { LearningLoadAnalysis as LearningLoadContent } from './LearningLoadAnalysis';
import { CardHeader } from './CardElements';
import { useEfficiencyTrends } from '../hooks/useEfficiencyTrends';
import { useDailyMetrics } from '../hooks/useDailyMetrics';
import { DAILY_GOAL_MINUTES as DEFAULT_DAILY_GOAL_MINUTES } from '../utils/constants';

// Lazy load the chart component
const LearningLoadChart = lazy(() => import('./LearningLoadChart'));

const ChartFallback = () => (
  <div className="w-full h-[230px] flex items-center justify-center bg-surface/5 rounded-xl border border-border/10">
    <Skeleton className="w-[90%] h-[180px] bg-surface/20" />
  </div>
);

export const LearningLoadCard = () => {
  const { loading, loadWeek, loadDay, loadMonth, loadAll } =
    useEfficiencyTrends();
  const { dailyGoalMinutes } = useDailyMetrics();

  const dailyGoal = dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES;

  if (loading)
    return (
      <Card className="h-full flex flex-col p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl bg-surface" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-surface" />
              <Skeleton className="h-3 w-48 bg-surface" />
            </div>
          </div>
        </div>
        <div className="flex-1 w-full min-h-0 mt-4 flex items-end gap-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton
              key={`skeleton-bar-${i}`}
              className="flex-1 rounded-t-lg bg-surface"
              style={{ height: `${(((i + 1) * 117) % 60) + 20}%` }}
            />
          ))}
        </div>
      </Card>
    );

  return (
    <EfficiencyModal
      title="Odaklanma Trendi"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <Card className="h-full flex flex-col p-6">
            <CardHeader
              icon={BookOpen}
              iconColor="text-accent"
              iconBg="bg-accent/10"
              title="Odaklanma Trendi"
              subtitle="Son 7 günlük çalışma aktivitesi"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />
            <div className="flex-1 w-full min-h-0 mt-4">
              <Suspense fallback={<ChartFallback />}>
                <LearningLoadChart data={loadWeek} targetMinutes={dailyGoal} />
              </Suspense>
            </div>
          </Card>
        </div>
      }
    >
      <LearningLoadContent
        dayData={loadDay}
        weekData={loadWeek}
        monthData={loadMonth}
        allData={loadAll}
        targetMinutes={dailyGoal}
      />
    </EfficiencyModal>
  );
};
