import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth';
import { ProgressHeader, CategoryGrid } from '@/features/courses';
import {
  getCategories,
  getUserStats,
  getAllCourses,
} from '@/shared/lib/core/client-db';
import { type Category } from '@/shared/types/courses';
import { logger } from '@/shared/lib/core/utils/logger';
import type { ProgressStats } from '@/shared/hooks/use-progress';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const isLoaded = !authLoading;
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'AuditPath';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Müfettişlik yolculuğuna başla. AuditPath ile ilerlemeni takip et.'
      );
    }

    async function loadData() {
      try {
        setLoading(true);
        // Load categories and all courses
        const [cats, allCourses] = await Promise.all([
          getCategories(),
          getAllCourses(),
        ]);

        // Check for uncategorized courses
        const categorizedCourseIds = new Set<string>();
        cats.forEach((c) =>
          c.courses.forEach((course) => categorizedCourseIds.add(course.id))
        );

        const uncategorized = allCourses.filter(
          (c) => !categorizedCourseIds.has(c.id)
        );

        if (uncategorized.length > 0) {
          const otherCategory: Category = {
            id: 'uncategorized',
            name: 'Diğer Dersler',
            slug: 'diger-dersler',
            courses: uncategorized,
            total_hours: uncategorized.reduce(
              (acc, c) => acc + (c.total_hours || 0),
              0
            ),
            sort_order: 999,
            created_at: new Date().toISOString(),
          };
          setCategories([...cats, otherCategory]);
        } else {
          setCategories(cats);
        }

        // Load stats if user is logged in
        if (userId) {
          const userStats = await getUserStats(userId);
          if (userStats) {
            setStats(userStats);
          }
        }
      } catch (e) {
        logger.error('Failed to load data', e as Error);
        setError('Veritabanı bağlantısı kurulamadı.');
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) {
      loadData();
    }
  }, [userId, isLoaded]);

  // Default stats for non-logged-in users or loading state
  const defaultStats: ProgressStats = {
    currentRank: {
      id: '1',
      name: 'Sürgün',
      color: 'text-slate-500',
      minPercentage: 0,
      motto: 'Bilginin krallığından uzakta, sislerin içinde yolunu arıyorsun.',
      imagePath: '/ranks/rank1.webp',
      order: 1,
    },
    nextRank: {
      id: '2',
      name: 'Yazıcı',
      color: 'text-amber-700',
      minPercentage: 25,
      motto:
        'Kadim metinleri kopyalayarak bilgeliğin izlerini sürmeye başladın.',
      imagePath: '/ranks/rank2.webp',
      order: 2,
    },
    rankProgress: 0,
    completedVideos: 0,
    totalVideos: categories.reduce(
      (sum: number, cat: Category) =>
        sum +
        cat.courses.reduce((s: number, c) => s + (c.total_videos || 0), 0),
      0
    ),
    completedHours: 0,
    totalHours: Math.round(
      categories.reduce(
        (sum: number, cat: Category) => sum + (cat.total_hours || 0),
        0
      )
    ),
    progressPercentage: 0,
    estimatedDays: 0,
    categoryProgress: {},
    courseProgress: {},
    streak: 0,
  };

  const currentStats = stats || defaultStats;

  if (loading && categories.length === 0) {
    // Show Loading but also allow access to Quiz for testing if needed?
    // Usually loading blocks everything.
    // Let's assume loading completes fast because our mocks are instant.
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 flex justify-center">
        Yükleniyor...
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
          currentRank={currentStats.currentRank ?? null}
          nextRank={currentStats.nextRank ?? null}
          rankProgress={currentStats.rankProgress ?? 0}
          completedVideos={currentStats.completedVideos}
          totalVideos={currentStats.totalVideos}
          completedHours={currentStats.completedHours}
          totalHours={currentStats.totalHours}
          progressPercentage={currentStats.progressPercentage ?? 0}
          estimatedDays={currentStats.estimatedDays ?? 0}
        />
      )}

      {categories.length > 0 && (
        <div className="space-y-4">
          <CategoryGrid
            categories={categories}
            categoryProgress={currentStats.categoryProgress}
          />
        </div>
      )}
    </div>
  );
}
