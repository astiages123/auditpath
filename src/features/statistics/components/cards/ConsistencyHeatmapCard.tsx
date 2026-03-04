import { Activity } from 'lucide-react';
import { StatisticsCard } from '@/features/statistics/components/cards/StatisticsCard';
import { StatisticsHeatmap } from '@/features/statistics/components/charts/StatisticsHeatmap';

import type { DayActivity } from '@/features/statistics/types/statisticsTypes';

// ==========================================
// === PROPS ===
// ==========================================

export interface ConsistencyHeatmapCardProps {
  consistencyData: DayActivity[];
}

// ==========================================
// === COMPONENT ===
// ==========================================

/**
 * Displays a wrapper card for a heatmap showing daily consistency.
 */
export const ConsistencyHeatmapCard = ({
  consistencyData,
}: ConsistencyHeatmapCardProps) => {
  // ==========================================
  // === RENDER ===
  // ==========================================
  return (
    <StatisticsCard
      title="Süreklilik Haritası"
      subtitle="Son 1 aylık çalışma yoğunluğu"
      tooltip="Günlük çalışma sıklığını ve sürekliliğini gösteren bir heatmap grafiğidir. Renk koyulaştıkça o günkü verimin daha yüksek olduğu anlamına gelir."
      icon={Activity}
    >
      <div className="flex-1 w-full flex items-center justify-center min-h-0 mt-4">
        <StatisticsHeatmap data={consistencyData} />
      </div>
    </StatisticsCard>
  );
};
