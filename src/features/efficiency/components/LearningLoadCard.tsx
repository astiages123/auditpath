import { lazy, Suspense } from 'react';
import { BookOpen, Maximize2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal } from './EfficiencyModal';
import { LearningLoadAnalysis as LearningLoadContent } from './LearningLoadAnalysis';
import { CardHeader } from './CardElements';
import { DAILY_GOAL_MINUTES as DEFAULT_DAILY_GOAL_MINUTES } from '../utils/constants';

import type { LearningLoad } from '../types/efficiencyTypes';

// ==========================================
// === LAZY COMPONENTS ===
// ==========================================

const LearningLoadChart = lazy(() => import('./LearningLoadChart'));

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
    <EfficiencyModal
      title="Odaklanma Trendi"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <Card className="h-full flex flex-col p-6 hover:border-accent/40 transition-all duration-300">
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
