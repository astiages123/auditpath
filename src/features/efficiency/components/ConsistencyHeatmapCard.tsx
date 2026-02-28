import { Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CardHeader } from './CardElements';
import { EfficiencyHeatmap } from './EfficiencyHeatmap';
import { useEfficiencyTrends } from '../hooks/useEfficiencyTrends';

export const ConsistencyHeatmapCard = () => {
  const { loading, consistencyData } = useEfficiencyTrends();

  if (loading)
    return (
      <Card className="h-full flex flex-col p-6">
        <Skeleton className="h-6 w-48 mb-6 bg-surface" />
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="grid grid-cols-7 gap-1.5">
            {[...Array(49)].map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-3.5 rounded-sm bg-surface" />
            ))}
          </div>
        </div>
      </Card>
    );

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
