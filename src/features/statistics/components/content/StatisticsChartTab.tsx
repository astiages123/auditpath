import React, { useState, lazy, Suspense } from 'react';
import { cn } from '@/utils/stringHelpers';
import { Skeleton } from '@/components/ui/skeleton';
import { CommonEmptyState } from '@/features/statistics/components/shared/CardElements';

import type { FocusPowerPoint } from '@/features/statistics/types/statisticsTypes';

// ==========================================
// === LAZY COMPONENTS ===
// ==========================================

const FocusPowerTrendChart = lazy(() =>
  import('@/features/statistics/components/charts/FocusPowerTrendChart').then(
    (m) => ({
      default: m.FocusPowerTrendChart,
    })
  )
);

// ==========================================
// === PROPS ===
// ==========================================

export interface StatisticsChartTabProps {
  weekData: FocusPowerPoint[];
  monthData: FocusPowerPoint[];
  allData: FocusPowerPoint[];
}

// ==========================================
// === COMPONENT: FALLBACK ===
// ==========================================

const ChartFallback = () => (
  <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-surface/5 rounded-lg border border-white/5">
    <Skeleton className="w-[90%] h-[250px] bg-surface/20" />
  </div>
);

// ==========================================
// === COMPONENT ===
// ==========================================

/**
 * Controller component orchestrating data range selection for the focus power trend chart.
 * Lazy loads Recharts visually while controlling its timeframe.
 */
export const StatisticsChartTab: React.FC<StatisticsChartTabProps> = ({
  weekData,
  monthData,
  allData,
}) => {
  // ==========================================
  // === HOOKS & STATE ===
  // ==========================================
  const [range, setRange] = useState<'week' | 'month' | 'all'>('week');

  // ==========================================
  // === DERIVED STATE ===
  // ==========================================
  const getData = () => {
    switch (range) {
      case 'week':
        return weekData;
      case 'month':
        return monthData;
      case 'all':
        return allData;
      default:
        return weekData;
    }
  };

  const getLabel = () => {
    switch (range) {
      case 'week':
        return 'Son 7 Gün';
      case 'month':
        return 'Son 30 Gün';
      case 'all':
        return 'Tüm Zamanlar';
      default:
        return '';
    }
  };

  // ==========================================
  // === RENDER ===
  // ==========================================
  const data = getData();
  const isEmpty = data.length === 0;

  return (
    <div className="space-y-4 bg-surface rounded-xl p-4 border border-white/5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Odak Gücü Trendi
          </h4>
          <span className="text-xs text-muted-foreground">
            {getLabel()} Performansı
          </span>
        </div>
        <div className="flex bg-surface p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setRange('week')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              range === 'week'
                ? 'bg-surface-hover text-white shadow-sm'
                : 'text-muted-foreground hover:text-white/80'
            )}
          >
            Hafta
          </button>
          <button
            onClick={() => setRange('month')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              range === 'month'
                ? 'bg-surface-hover text-white shadow-sm'
                : 'text-muted-foreground hover:text-white/80'
            )}
          >
            Ay
          </button>
          <button
            onClick={() => setRange('all')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              range === 'all'
                ? 'bg-surface-hover text-white shadow-sm'
                : 'text-muted-foreground hover:text-white/80'
            )}
          >
            Tümü
          </button>
        </div>
      </div>

      <div className="h-[350px] w-full bg-black/10 rounded-lg border border-white/5 p-2">
        {isEmpty ? (
          <CommonEmptyState message="Seçilen döneme ait performans verisi bulunamadı." />
        ) : (
          <Suspense fallback={<ChartFallback />}>
            <FocusPowerTrendChart
              key={`${range}-chart`}
              data={data}
              rangeLabel={range}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};
