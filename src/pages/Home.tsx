import { useEffect } from 'react';
import { useHomeData } from '@/features/courses/hooks/useHomeData';
import { ProgressHeader } from '@/features/courses/components/ProgressHeader';
import { CategoryGrid } from '@/features/courses/components/CategoryGrid';
import {
  HomeProgressSkeleton,
  CategoryGridSkeleton,
} from '@/shared/components/SkeletonTemplates';

export default function HomePage() {
  const { categories, stats, loading, error } = useHomeData();

  useEffect(() => {
    document.title = 'AuditPath';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Müfettişlik yolculuğuna başla. AuditPath ile ilerlemeni takip et.'
      );
    }
  }, []);

  if (loading && categories.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12">
        <HomeProgressSkeleton />
        <CategoryGridSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 mb-8">
          <h3 className="font-semibold text-destructive mb-2">
            Veritabanı Hatası
          </h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {!error && (
        <ProgressHeader
          currentRank={stats.currentRank ?? null}
          nextRank={stats.nextRank ?? null}
          rankProgress={stats.rankProgress ?? 0}
          completedVideos={stats.completedVideos}
          totalVideos={stats.totalVideos}
          completedHours={stats.completedHours}
          totalHours={stats.totalHours}
          progressPercentage={stats.progressPercentage ?? 0}
          estimatedDays={stats.estimatedDays ?? 0}
        />
      )}

      {categories.length > 0 && (
        <div className="space-y-4">
          <CategoryGrid
            categories={categories}
            categoryProgress={stats.categoryProgress}
          />
        </div>
      )}
    </div>
  );
}
