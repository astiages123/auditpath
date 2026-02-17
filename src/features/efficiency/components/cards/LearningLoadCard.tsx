import React from 'react';
import { BookOpen, Maximize2 } from 'lucide-react';
import { GlassCard } from '@/shared/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal, LearningLoadContent } from '../EfficiencyModals';
import { LearningLoadChart } from '../charts/LearningLoadChart';
import { EfficiencyData } from './types';
import { CardHeader } from './CardElements';

interface LearningLoadCardProps {
  data: EfficiencyData;
}

const DEFAULT_DAILY_GOAL_MINUTES = 200;

export const LearningLoadCard = ({ data }: LearningLoadCardProps) => {
  const { loading, loadWeek, loadDay, loadMonth, loadAll, dailyGoalMinutes } =
    data;

  const dailyGoal = dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES;

  if (loading)
    return (
      <GlassCard className="h-full flex flex-col p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl bg-white/5" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-white/5" />
              <Skeleton className="h-3 w-48 bg-white/5" />
            </div>
          </div>
        </div>
        <div className="flex-1 w-full min-h-0 mt-4 flex items-end gap-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-lg bg-white/5"
              style={{
                height: `${(((i + 1) * 117) % 60) + 20}%`,
              }}
            />
          ))}
        </div>
      </GlassCard>
    );

  return (
    <EfficiencyModal
      title="Odaklanma Trendi"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <GlassCard className="h-full flex flex-col p-6">
            <CardHeader
              icon={BookOpen}
              iconColor="text-sky-400"
              iconBg="bg-sky-500/10"
              title="Odaklanma Trendi"
              subtitle="Son 7 günlük çalışma aktivitesi"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />
            <div className="flex-1 w-full min-h-0 mt-4">
              <LearningLoadChart data={loadWeek} targetMinutes={dailyGoal} />
            </div>
          </GlassCard>
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
