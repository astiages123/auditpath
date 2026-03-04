import { lazy, Suspense } from 'react';
import { BookOpen, Maximize2 } from 'lucide-react';
import { StatisticsCard } from '@/features/statistics/components/cards/StatisticsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { StatisticsModal } from '@/features/statistics/components/modals/StatisticsModal';
import { LearningLoadAnalysis as LearningLoadContent } from '@/features/statistics/components/content/LearningLoadAnalysis';

import { DAILY_GOAL_MINUTES as DEFAULT_DAILY_GOAL_MINUTES } from '@/features/statistics/utils/constants';

import type { LearningLoad } from '@/features/statistics/types/statisticsTypes';

// ==========================================
// === LAZY COMPONENTS ===
// ==========================================

const LearningLoadChart = lazy(
  () => import('@/features/statistics/components/charts/LearningLoadChart')
);

// ==========================================
// === PROPS ===
// ==========================================

export interface LearningLoadCardProps {
  loadWeek: LearningLoad[];
  loadDay: LearningLoad[];
  loadMonth: LearningLoad[];
  loadAll: LearningLoad[];
  dailyGoalMinutes: number;
}

// ==========================================
// === COMPONENT: FALLBACK ===
// ==========================================

const ChartFallback = () => (
  <div className="w-full h-[230px] flex items-center justify-center bg-surface/5 rounded-xl border border-border/10">
    <Skeleton className="w-[90%] h-[180px] bg-surface/20" />
  </div>
);

// ==========================================
// === COMPONENT ===
// ==========================================

export const LearningLoadCard = ({
  loadWeek,
  loadDay,
  loadMonth,
  loadAll,
  dailyGoalMinutes,
}: LearningLoadCardProps) => {
  // ==========================================
  // === DERIVED STATE ===
  // ==========================================
  const dailyGoal = dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES;

  // ==========================================
  // === RENDER ===
  // ==========================================
  return (
    <StatisticsModal
      title="Odaklanma Trendi"
      trigger={
        <StatisticsCard
          title="Odaklanma Trendi"
          subtitle="Son 7 günlük çalışma aktivitesi"
          tooltip="Hangi gün ne kadar süre odaklandığını gösteren aktivite grafiğidir. Günlük hedefine ne kadar yaklaştığını buradan takip edebilirsin."
          icon={BookOpen}
          action={
            <Maximize2 className="w-5 h-5 text-muted-foreground/30 group-hover:text-white transition-colors" />
          }
        >
          <div className="flex-1 w-full min-h-0 mt-4">
            <Suspense fallback={<ChartFallback />}>
              <LearningLoadChart data={loadWeek} targetMinutes={dailyGoal} />
            </Suspense>
          </div>
        </StatisticsCard>
      }
    >
      <LearningLoadContent
        dayData={loadDay}
        weekData={loadWeek}
        monthData={loadMonth}
        allData={loadAll}
        targetMinutes={dailyGoal}
      />
    </StatisticsModal>
  );
};
