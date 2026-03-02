import { lazy, Suspense } from 'react';
import { Zap, Maximize2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal } from './EfficiencyModal';
import { PracticePerformanceRadar as PracticeCenterContent } from './PracticePerformanceRadar';
import { CardHeader } from './CardElements';
import { useCognitiveInsights } from '../hooks/useCognitiveInsights';

// Lazy load the chart component
const BloomKeyChart = lazy(() =>
  import('./BloomKeyChart').then((m) => ({
    default: m.BloomKeyChart,
  }))
);

const ChartFallback = () => (
  <div className="w-full h-full flex items-center justify-center min-h-[150px]">
    <Skeleton className="h-40 w-40 rounded-full bg-surface/20" />
  </div>
);

export const PracticeCenterCard = () => {
  const { loadingBloom: loading, bloomStats } = useCognitiveInsights();

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
        <div className="flex-1 w-full flex items-center justify-center">
          <Skeleton className="h-48 w-48 rounded-full bg-surface" />
        </div>
      </Card>
    );

  return (
    <EfficiencyModal
      title="Pratik Merkezi İstatistikleri"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <Card className="h-full flex flex-col p-6">
            <CardHeader
              icon={Zap}
              iconColor="text-accent"
              iconBg="bg-accent/10"
              title="Pratik Merkezi"
              subtitle="Soru çözümü ve seviye analizi"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />

            <div className="flex-1 w-full flex items-center justify-center min-h-0">
              <div className="w-full h-full flex items-center justify-center p-2">
                <Suspense fallback={<ChartFallback />}>
                  <BloomKeyChart data={bloomStats} />
                </Suspense>
              </div>
            </div>
          </Card>
        </div>
      }
    >
      <PracticeCenterContent data={bloomStats} />
    </EfficiencyModal>
  );
};
