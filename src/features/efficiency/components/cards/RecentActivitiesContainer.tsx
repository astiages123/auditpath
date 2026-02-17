import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/shared/components/GlassCard';
import { RecentActivitiesCard } from '../RecentActivitiesCard';
import { EfficiencyData } from './types';

interface RecentActivitiesContainerProps {
  data: EfficiencyData;
}

export const RecentActivitiesContainer = ({
  data,
}: RecentActivitiesContainerProps) => {
  const {
    loading,
    recentSessions,
    focusPowerWeek,
    focusPowerMonth,
    focusPowerAll,
  } = data;

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
        <div className="flex-1 space-y-3 mt-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-lg border border-white/5"
            >
              <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 bg-white/5" />
                <Skeleton className="h-3 w-24 bg-white/5" />
              </div>
              <Skeleton className="h-6 w-16 bg-white/5" />
            </div>
          ))}
        </div>
      </GlassCard>
    );

  return (
    <div className="h-full w-full">
      <RecentActivitiesCard
        sessions={recentSessions}
        focusPowerWeek={focusPowerWeek}
        focusPowerMonth={focusPowerMonth}
        focusPowerAll={focusPowerAll}
      />
    </div>
  );
};
