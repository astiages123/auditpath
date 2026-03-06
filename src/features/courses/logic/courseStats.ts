type CategoryProgressStats = {
  completedVideos: number;
  completedHours: number;
  totalVideos: number;
  totalHours: number;
  completedReadings: number;
  completedPages: number;
  totalReadings: number;
  totalPages: number;
};

export interface Course {
  id: string;
  type?: string;
  total_videos: number | null;
  total_hours: number | null;
  total_pages?: number | null;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  total_hours?: number | null;
  courses: Course[];
}

export interface CategoryStatsResult {
  categoryStats: Record<string, CategoryProgressStats>;
  totalAllVideos: number;
  totalAllHours: number;
  totalAllReadings: number;
  totalAllPages: number;
}

/**
 * Calculates static totals for categories and their courses.
 * @param categories - Array of categories containing course details
 * @returns An object containing calculated totals for videos, hours, readings, and pages
 */
export const calculateStaticTotals = (
  categories: Category[]
): CategoryStatsResult => {
  const categoryStats: Record<string, CategoryProgressStats> = {};

  let totalAllVideos = 0;
  let totalAllHours = 0;
  let totalAllReadings = 0;
  let totalAllPages = 0;

  categories.forEach((category) => {
    const categoryName = category.slug || category.name;

    let categoryTotalVideos = 0;
    let categoryTotalReadings = 0;
    let categoryTotalPages = 0;

    category.courses?.forEach((course) => {
      if (course.type === 'reading') {
        categoryTotalReadings += course.total_videos || 0;
      } else {
        categoryTotalVideos += course.total_videos || 0;
      }
      categoryTotalPages += course.total_pages || 0;
    });

    categoryStats[categoryName] = {
      completedVideos: 0,
      completedHours: 0,
      totalVideos: categoryTotalVideos,
      totalHours: Number(category.total_hours) || 0,
      completedReadings: 0,
      completedPages: 0,
      totalReadings: categoryTotalReadings,
      totalPages: categoryTotalPages,
    };

    totalAllVideos += categoryTotalVideos;
    totalAllHours += category.total_hours || 0;
    totalAllReadings += categoryTotalReadings;
    totalAllPages += categoryTotalPages;
  });

  return {
    categoryStats,
    totalAllVideos,
    totalAllHours,
    totalAllReadings,
    totalAllPages,
  };
};
