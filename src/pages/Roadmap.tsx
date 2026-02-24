import { useProgress } from '@/shared/hooks/useProgress';
import TitleRoadmap from '@/features/courses/components/TitleRoadmap';
import { Loader2 } from 'lucide-react';

export default function RoadmapPage() {
  const { stats, isLoading } = useProgress();

  const completedVideos = stats?.completedVideos ?? 0;
  const totalVideos = stats?.totalVideos ?? 0;

  return (
    <div className="bg-background">
      <div className="relative">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin size-8 text-primary" />
          </div>
        ) : (
          stats && (
            <TitleRoadmap
              watchedVideos={completedVideos}
              requiredVideos={totalVideos}
            />
          )
        )}
      </div>
    </div>
  );
}
