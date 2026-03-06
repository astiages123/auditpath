import { lazy, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { LearningLoad } from '@/features/statistics/types/statisticsTypes';
import { CommonEmptyState } from '@/features/statistics/components/shared/CardElements';

const LearningLoadChart = lazy(
  () => import('@/features/statistics/components/charts/LearningLoadChart')
);

export interface LearningLoadAnalysisProps {
  dayData: LearningLoad[];
  weekData: LearningLoad[];
  monthData: LearningLoad[];
  allData: LearningLoad[];
  targetMinutes?: number;
}

const ChartFallback = () => (
  <div className="w-full h-[230px] flex items-center justify-center bg-surface/5 rounded-xl border border-border/10">
    <Skeleton className="w-[90%] h-[180px] bg-surface/20" />
  </div>
);

export const LearningLoadAnalysis = ({
  dayData,
  weekData,
  monthData,
  allData,
  targetMinutes = 200,
}: LearningLoadAnalysisProps) => {
  const renderChart = (data: LearningLoad[], showTarget: boolean = false) => {
    if (data.length === 0) {
      return (
        <CommonEmptyState message="Bu döneme ait çalışma yükü verisi bulunamadı." />
      );
    }
    return (
      <Suspense fallback={<ChartFallback />}>
        <LearningLoadChart
          data={data}
          targetMinutes={showTarget ? targetMinutes : undefined}
        />
      </Suspense>
    );
  };

  return (
    <Tabs defaultValue="week" className="w-full">
      <TabsList className="w-full grid grid-cols-4">
        <TabsTrigger value="day">Gün</TabsTrigger>
        <TabsTrigger value="week">Hafta</TabsTrigger>
        <TabsTrigger value="month">Ay</TabsTrigger>
        <TabsTrigger value="all">Tümü</TabsTrigger>
      </TabsList>
      <TabsContent
        value="day"
        className="mt-4 p-4 border border-border/50 rounded-xl bg-white/5"
      >
        {renderChart(dayData, true)}
      </TabsContent>
      <TabsContent
        value="week"
        className="mt-4 p-4 border border-border/50 rounded-xl bg-white/5"
      >
        {renderChart(weekData, true)}
      </TabsContent>
      <TabsContent
        value="month"
        className="mt-4 p-4 border border-border/50 rounded-xl bg-white/5"
      >
        {renderChart(monthData)}
      </TabsContent>
      <TabsContent
        value="all"
        className="mt-4 p-4 border border-border/50 rounded-xl bg-white/5"
      >
        {renderChart(allData)}
      </TabsContent>
    </Tabs>
  );
};
