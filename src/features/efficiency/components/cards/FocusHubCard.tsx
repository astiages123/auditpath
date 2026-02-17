import React from 'react';
import { Target, Maximize2 } from 'lucide-react';
import { cn } from '@/utils/core';
import { GlassCard } from '@/shared/components/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal, FocusHubContent } from '../EfficiencyModals';
import { GoalProgressRing } from '../charts/GoalProgressRing';
import { EfficiencyData } from './types';
import { CardHeader, TrendBadge } from './CardElements';
import { getFlowColor, getFlowStatusLabel } from './utils';

interface FocusHubCardProps {
  data: EfficiencyData;
}

const DEFAULT_DAILY_GOAL_MINUTES = 200;

export const FocusHubCard = ({ data }: FocusHubCardProps) => {
  const {
    loading,
    currentWorkMinutes,
    todayVideoMinutes,
    todayVideoCount,
    videoTrendPercentage,
    sessions,
    dailyGoalMinutes,
    efficiencyTrend,
    trendPercentage,
    learningFlow,
    flowState,
    goalProgress,
  } = data;

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
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 mt-6">
          <Skeleton className="h-40 w-40 rounded-full bg-white/5 shrink-0" />
          <div className="space-y-4 w-full md:w-auto flex flex-col items-center md:items-start">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 bg-white/5" />
              <Skeleton className="h-10 w-48 bg-white/5" />
            </div>
            <div className="space-y-2 w-full">
              <Skeleton className="h-16 w-full md:w-48 bg-white/5 rounded-lg" />
              <Skeleton className="h-16 w-full md:w-48 bg-white/5 rounded-lg" />
            </div>
          </div>
        </div>
      </GlassCard>
    );

  return (
    <EfficiencyModal
      title="Öğrenme Akışı Analizi"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <GlassCard className="h-full flex flex-col p-6">
            <CardHeader
              icon={Target}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-500/10"
              title="Öğrenme Akışı"
              subtitle="Video hızı ve çalışma süresi oranı. İdeal: 1.0x"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />

            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 mt-6">
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
                        'text-4xl font-bold font-heading',
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

                <div className="grid grid-cols-2 gap-6">
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
          </GlassCard>
        </div>
      }
    >
      <FocusHubContent trendData={efficiencyTrend} sessions={sessions} />
    </EfficiencyModal>
  );
};
