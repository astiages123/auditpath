import React from 'react';
import { Calendar } from 'lucide-react';
import { GlassCard } from '@/shared/components/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyHeatmap } from '../EfficiencyHeatmap';
import { EfficiencyData } from './types';
import { CardHeader } from './CardElements';

interface ConsistencyHeatmapCardProps {
  data: EfficiencyData;
}

export const ConsistencyHeatmapCard = ({
  data,
}: ConsistencyHeatmapCardProps) => {
  const { loading, consistencyData } = data;

  if (loading)
    return (
      <GlassCard className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl bg-white/5" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-white/5" />
              <Skeleton className="h-3 w-48 bg-white/5" />
            </div>
          </div>
        </div>
        <div className="flex-1 bg-white/2 rounded-xl p-5 mt-5 border border-white/5 flex flex-wrap gap-2">
          {[...Array(30)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-md bg-white/5" />
          ))}
        </div>
      </GlassCard>
    );

  return (
    <GlassCard className="p-6 flex flex-col h-full">
      <CardHeader
        icon={Calendar}
        iconColor="text-emerald-400"
        iconBg="bg-emerald-500/10"
        title="Tutarlılık Analizi"
        subtitle="Son 30 günlük çalışma disiplini"
      />

      <div className="flex-1 flex items-center justify-center bg-white/2 rounded-xl p-5 mt-5 border border-white/5 h-full">
        <div className="w-full h-full">
          <EfficiencyHeatmap data={consistencyData} />
        </div>
      </div>
    </GlassCard>
  );
};
