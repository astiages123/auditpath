import { lazy, Suspense } from 'react';
import { Zap, Maximize2 } from 'lucide-react';
import { StatisticsCard } from '@/features/efficiency/components/cards/StatisticsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal } from '@/features/efficiency/components/modals/EfficiencyModal';
import { PracticePerformanceRadar as PracticeCenterContent } from '@/features/efficiency/components/charts/PracticePerformanceRadar';

import type { BloomStats } from '@/features/quiz/types';

// ==========================================
// === LAZY COMPONENTS ===
// ==========================================

const BloomKeyChart = lazy(() =>
  import('@/features/efficiency/components/charts/BloomKeyChart').then((m) => ({
    default: m.BloomKeyChart,
  }))
);

// ==========================================
// === TYPES / PROPS ===
// ==========================================

export interface PracticeCenterCardProps {
  bloomStats: BloomStats[];
}

// ==========================================
// === COMPONENT: FALLBACK ===
// ==========================================

const ChartFallback = () => (
  <div className="w-full h-full flex items-center justify-center min-h-[150px]">
    <Skeleton className="h-40 w-40 rounded-full bg-surface/20" />
  </div>
);

// ==========================================
// === COMPONENT ===
// ==========================================

export const PracticeCenterCard = ({ bloomStats }: PracticeCenterCardProps) => {
  // ==========================================
  // === RENDER ===
  // ==========================================
  return (
    <EfficiencyModal
      title="Pratik Merkezi İstatistikleri"
      trigger={
        <StatisticsCard
          title="Pratik Merkezi"
          subtitle="Soru çözümü ve seviye analizi"
          tooltip="Bloom taksonomisine göre hangi seviyede sorular çözdüğünü gösterir. Analiz, Sentez gibi üst basamaklara çıkmak konuyu tam kavradığını gösterir."
          icon={Zap}
          action={
            <Maximize2 className="w-5 h-5 text-muted-foreground/30 group-hover:text-white transition-colors" />
          }
        >
          <div className="flex-1 w-full flex items-center justify-center min-h-0">
            <div className="w-full h-full flex items-center justify-center p-2">
              <Suspense fallback={<ChartFallback />}>
                <BloomKeyChart data={bloomStats} />
              </Suspense>
            </div>
          </div>
        </StatisticsCard>
      }
    >
      <PracticeCenterContent data={bloomStats} />
    </EfficiencyModal>
  );
};
