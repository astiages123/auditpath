import { lazy, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EfficiencyTrend, Session } from '../types/efficiencyTypes';
import { DistractionDetails } from './DistractionDetails';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the chart component
const EfficiencyTrendChart = lazy(() =>
  import('./EfficiencyTrendChart').then((m) => ({
    default: m.EfficiencyTrendChart,
  }))
);

const ChartFallback = () => (
  <div className="w-full h-[400px] flex items-center justify-center bg-surface/5 rounded-xl border border-border/10">
    <Skeleton className="w-[90%] h-[300px] bg-surface/20" />
  </div>
);

interface FocusStreamHubProps {
  sessions: Session[];
  trendData: EfficiencyTrend[];
}

export const FocusStreamHub = ({
  sessions,
  trendData,
}: FocusStreamHubProps) => (
  <Tabs defaultValue="analysis" className="w-full">
    <TabsList className="w-full grid grid-cols-2">
      <TabsTrigger value="analysis">Odaklanma Trendi</TabsTrigger>
      <TabsTrigger value="history">Öğrenme Akışı Geçmişi</TabsTrigger>
    </TabsList>
    <TabsContent
      value="analysis"
      className="p-4 border border-border/50 rounded-xl mt-4 bg-white/5"
    >
      <DistractionDetails sessions={sessions} />
    </TabsContent>
    <TabsContent
      value="history"
      className="p-4 border border-border/50 rounded-xl mt-4 bg-white/5"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Günlük Öğrenme Akışı Trendi
          </h4>
          <span className="text-[10px] text-muted-foreground">SON 30 GÜN</span>
        </div>
        <Suspense fallback={<ChartFallback />}>
          <EfficiencyTrendChart data={trendData} />
        </Suspense>
      </div>
    </TabsContent>
  </Tabs>
);
