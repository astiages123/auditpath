
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ProgressHeader } from "@/components/home/ProgressHeader";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { getCategories, getUserStats, type Category } from "@/lib/client-db";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const isLoaded = !authLoading;
  const [categories, setCategories] = useState<Category[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "AuditPath";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Müfettişlik yolculuğuna başla. AuditPath ile ilerlemeni takip et."
      );
    }

    async function loadData() {
      try {
        setLoading(true);
        // Load categories
        const cats = await getCategories();
        setCategories(cats);  

        // Load stats if user is logged in
        if (userId) {
          const userStats = await getUserStats(userId);
          if (userStats) {
            setStats(userStats);
          }
        }
      } catch (e) {
        console.error("Failed to load data", e);
        setError("Veritabanı bağlantısı kurulamadı.");
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) {
      loadData();
    }
  }, [userId, isLoaded]);

  // Default stats for non-logged-in users or loading state
  const defaultStats = {
    currentRank: {
      id: "1",
      name: "Sürgün",
      color: "text-slate-400",
      minPercentage: 0,
    },
    nextRank: {
      id: "2",
      name: "Yazıcı",
      color: "text-amber-700",
      minPercentage: 25,
    },
    rankProgress: 0,
    completedVideos: 0,
    totalVideos: categories.reduce(
      (sum: number, cat: Category) => sum + cat.courses.reduce((s: number, c) => s + (c.total_videos || 0), 0),
      0
    ),
    completedHours: 0,
    totalHours: Math.round(
      categories.reduce((sum: number, cat: Category) => sum + (cat.total_hours || 0), 0)
    ),
    progressPercentage: 0,
    estimatedDays: 0,
    categoryProgress: {},
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
          currentRank={currentStats.currentRank}
          nextRank={currentStats.nextRank}
          rankProgress={currentStats.rankProgress}
          completedVideos={currentStats.completedVideos}
          totalVideos={currentStats.totalVideos}
          completedHours={currentStats.completedHours}
          totalHours={currentStats.totalHours}
          progressPercentage={currentStats.progressPercentage}
          estimatedDays={currentStats.estimatedDays}
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
