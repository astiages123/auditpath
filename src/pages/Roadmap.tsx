import { useEffect } from 'react';
import { useProgress } from '@/shared/hooks/useProgress';
import TitleRoadmap from '@/features/courses/components/views/TitleRoadmap';
import { Loader2 } from 'lucide-react';

export default function RoadmapPage() {
  const { stats, isLoading } = useProgress();

  useEffect(() => {
    document.title = 'Yolculuk | Sapiera';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        "Müfettişlik unvan yolculuğunu takip et. Sürgünden Yüce Bilgin'e uzanan efsanevi yolculuğuna bak."
      );
    }
  }, []);

  const completedVideos = stats?.completedVideos ?? 0;
  const totalVideos = stats?.totalVideos ?? 0;
  const dailyAverage = stats?.dailyAverage ?? 0;
  const completedHours = stats?.completedHours ?? 0;
  const totalHours = stats?.totalHours ?? 0;

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-20 overflow-hidden">
      {/* Background Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(oklch(var(--primary)) 0.5px, transparent 0.5px), linear-gradient(to right, oklch(var(--primary)) 0.5px, transparent 0.5px), linear-gradient(to bottom, oklch(var(--primary)) 0.5px, transparent 0.5px)`,
          backgroundSize: '24px 24px, 120px 120px, 120px 120px',
        }}
      />

      <div className="relative z-10 container mx-auto px-3 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin size-8 text-primary" />
          </div>
        ) : (
          stats && (
            <TitleRoadmap
              watchedVideos={completedVideos}
              requiredVideos={totalVideos}
              dailyAverage={dailyAverage}
              completedHours={completedHours}
              totalHours={totalHours}
            />
          )
        )}
      </div>
    </div>
  );
}
