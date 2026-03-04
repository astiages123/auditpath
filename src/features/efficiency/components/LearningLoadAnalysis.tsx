import { lazy, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { LearningLoad } from '../types/efficiencyTypes';

// ==========================================
// === LAZY COMPONENTS ===
// ==========================================

const LearningLoadChart = lazy(() => import('./LearningLoadChart'));

// ==========================================
// === TYPES / PROPS ===
// ==========================================

export interface LearningLoadAnalysisProps {
  dayData: LearningLoad[];
  weekData: LearningLoad[];
  monthData: LearningLoad[];
  allData: LearningLoad[];
  targetMinutes?: number;
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

export const LearningLoadAnalysis = ({
  dayData,
  weekData,
  monthData,
  allData,
  targetMinutes = 200,
}: LearningLoadAnalysisProps) => (
  // ==========================================
  // === RENDER ===
  // ==========================================
  <Tabs defaultValue="week" className="w-full">
    <TabsList className="w-full grid grid-cols-4">
      <TabsTrigger value="day">Gün</TabsTrigger>
      <TabsTrigger value="week">Hafta</TabsTrigger>
      <TabsTrigger value="month">Ay</TabsTrigger>
      <TabsTrigger value="all">Tümü</TabsTrigger>
    </TabsList>
    <TabsContent value="day" className="mt-4">
      <Suspense fallback={<ChartFallback />}>
        <LearningLoadChart data={dayData} targetMinutes={targetMinutes} />
      </Suspense>
    </TabsContent>
    <TabsContent value="week" className="mt-4">
      <Suspense fallback={<ChartFallback />}>
        <LearningLoadChart data={weekData} targetMinutes={targetMinutes} />
      </Suspense>
    </TabsContent>
    <TabsContent value="month" className="mt-4">
      <Suspense fallback={<ChartFallback />}>
        <LearningLoadChart data={monthData} />
      </Suspense>
    </TabsContent>
    <TabsContent value="all" className="mt-4">
      <Suspense fallback={<ChartFallback />}>
        <LearningLoadChart data={allData} />
      </Suspense>
    </TabsContent>
  </Tabs>
);
