import { Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CardHeader } from './CardElements';
import { EfficiencyHeatmap } from './EfficiencyHeatmap';

import type { DayActivity } from '../types/efficiencyTypes';

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
    <Card className="h-full flex flex-col p-6">
      <CardHeader
        icon={Activity}
        iconColor="text-accent"
        iconBg="bg-accent/10"
        title="Süreklilik Haritası"
        subtitle="Son 1 aylık çalışma yoğunluğu"
      />
      <div className="flex-1 w-full flex items-center justify-center min-h-0 mt-4">
        <EfficiencyHeatmap data={consistencyData} />
      </div>
    </Card>
  );
};
