
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserStats } from "@/lib/client-db";
import { ProgressStats } from "@/hooks/useProgress";
import coursesData from "@/data/courses.json";

export const progressKeys = {
  all: ["progress"] as const,
  user: (userId: string) => [...progressKeys.all, userId] as const,
};

// Static data calculation (moved from Provider to here or shared util)
interface Course {
  id: string;
  totalVideos: number;
  totalHours: number;
}
interface Category {
  category: string;
  courses: Course[];
}

const calculateStaticTotals = () => {
  const categories = coursesData as Category[];
  const categoryStats: Record<
    string,
    {
      completedVideos: number;
      completedHours: number;
      totalVideos: number;
      totalHours: number;
    }
  > = {};

  let totalAllVideos = 0;
  let totalAllHours = 0;

  categories.forEach((cat) => {
    const categoryName =
      cat.category.split(" (")[0].split(". ")[1] || cat.category;
    let catTotalVideos = 0;
    let catTotalHours = 0;

    cat.courses.forEach((course) => {
      catTotalVideos += course.totalVideos;
      catTotalHours += course.totalHours;
    });

    categoryStats[categoryName] = {
      completedVideos: 0,
      completedHours: 0,
      totalVideos: catTotalVideos,
      totalHours: catTotalHours,
    };

    totalAllVideos += catTotalVideos;
    totalAllHours += catTotalHours;
  });

  return { categoryStats, totalAllVideos, totalAllHours };
};

const staticTotals = calculateStaticTotals();

export const defaultStats: ProgressStats = {
  completedVideos: 0,
  totalVideos: staticTotals.totalAllVideos,
  completedHours: 0,
  totalHours: staticTotals.totalAllHours,
  streak: 0,
  categoryProgress: staticTotals.categoryStats,
  courseProgress: {},
};

export function useProgressQuery(userId?: string, initialStats?: Partial<ProgressStats>) {
  return useQuery({
    queryKey: progressKeys.user(userId || "guest"),
    queryFn: async () => {
      if (!userId) return defaultStats;
      
      const dbStats = await getUserStats(userId);
      if (!dbStats) return defaultStats;

      // Merge Logic from Provider
      const mergedCategoryProgress = { ...staticTotals.categoryStats };

      if (dbStats.categoryProgress) {
        Object.entries(dbStats.categoryProgress).forEach(
          ([catName, stats]: [
            string,
            { completedVideos: number; completedHours: number }
          ]) => {
            if (mergedCategoryProgress[catName]) {
              mergedCategoryProgress[catName] = {
                ...mergedCategoryProgress[catName],
                completedVideos: stats.completedVideos || 0,
                completedHours: stats.completedHours || 0,
              };
            }
          }
        );
      }

      return {
        completedVideos: dbStats.completedVideos,
        totalVideos: staticTotals.totalAllVideos,
        completedHours: dbStats.completedHours,
        totalHours: staticTotals.totalAllHours,
        streak: dbStats.streak || 0,
        categoryProgress: mergedCategoryProgress,
        courseProgress: dbStats.courseProgress || {},
        currentRank: dbStats.currentRank,
        nextRank: dbStats.nextRank,
        rankProgress: dbStats.rankProgress,
        progressPercentage: dbStats.progressPercentage,
        estimatedDays: dbStats.estimatedDays,
      } as ProgressStats;
    },
    enabled: !!userId,
    initialData: initialStats ? { ...defaultStats, ...initialStats } : undefined,
    staleTime: 5 * 60 * 1000, // 5 mins
  });
}

export function useOptimisticProgress() {
  const queryClient = useQueryClient();

  const updateProgress = (userId: string, courseId: string, deltaVideos: number, deltaHours: number) => {
    queryClient.setQueryData(progressKeys.user(userId), (old: ProgressStats | undefined) => {
      if (!old) return old;

      const categories = coursesData as Category[];
      const categoryData = categories.find((cat) =>
        cat.courses.some((c) => c.id === courseId)
      );

      if (!categoryData) return old;

      const categoryName =
        categoryData.category.split(" (")[0].split(". ")[1] ||
        categoryData.category;

      const existingCatStats = old.categoryProgress[categoryName] || {
        completedVideos: 0,
        completedHours: 0,
        totalVideos: 0,
        totalHours: 0,
      };

      const newCategoryProgress = {
        ...old.categoryProgress,
        [categoryName]: {
          ...existingCatStats,
          completedVideos: existingCatStats.completedVideos + deltaVideos,
          completedHours: existingCatStats.completedHours + deltaHours,
        },
      };

      return {
        ...old,
        completedVideos: old.completedVideos + deltaVideos,
        completedHours: old.completedHours + deltaHours,
        courseProgress: {
          ...old.courseProgress,
          [courseId]: (old.courseProgress[courseId] || 0) + deltaVideos,
        },
        categoryProgress: newCategoryProgress,
      };
    });
  };

  return { updateProgress };
}
