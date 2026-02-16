import React from 'react';
import { Zap, Maximize2 } from 'lucide-react';
import { GlassCard } from '@/shared/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal, PracticeCenterContent } from '../EfficiencyModals';
import { BloomKeyChart } from '../EfficiencyCharts';
import { EfficiencyData } from './types';
import { CardHeader } from './CardElements';

interface PracticeCenterCardProps {
  data: EfficiencyData;
}

export const PracticeCenterCard = ({ data }: PracticeCenterCardProps) => {
  const { loading, bloomStats } = data;

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
        <div className="flex-1 w-full flex items-center justify-center">
          <Skeleton className="h-48 w-48 rounded-full bg-white/5" />
        </div>
      </GlassCard>
    );

  return (
    <EfficiencyModal
      title="Pratik Merkezi İstatistikleri"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <GlassCard className="h-full flex flex-col p-6">
            <CardHeader
              icon={Zap}
              iconColor="text-amber-400"
              iconBg="bg-amber-500/10"
              title="Pratik Merkezi"
              subtitle="Soru çözümü ve seviye analizi"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />

            <div className="flex-1 w-full flex items-center justify-center min-h-0">
              <div className="w-full h-full flex items-center justify-center p-2">
                <BloomKeyChart data={bloomStats} />
              </div>
            </div>
          </GlassCard>
        </div>
      }
    >
      <PracticeCenterContent>
        <BloomKeyChart data={bloomStats} />
      </PracticeCenterContent>
    </EfficiencyModal>
  );
};
