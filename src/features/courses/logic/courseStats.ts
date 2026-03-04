// ===========================
// === TYPE DEFINITIONS ===
// ===========================

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
  categoryStats: Record<
    string,
    {
      completedVideos: number;
      completedHours: number;
      totalVideos: number;
      totalHours: number;
      completedReadings: number;
      completedPages: number;
      totalReadings: number;
      totalPages: number;
    }
  >;
  totalAllVideos: number;
  totalAllHours: number;
  totalAllReadings: number;
  totalAllPages: number;
}

// ===========================
// === LOGIC FUNCTIONS ===
// ===========================

/**
 * Calculates static totals for categories and their courses.
 * @param categories - Array of categories containing course details
 * @returns An object containing calculated totals for videos, hours, readings, and pages
 */
export const calculateStaticTotals = (
  categories: Category[]
): CategoryStatsResult => {
  const categoryStats: Record<
    string,
    {
      completedVideos: number;
      completedHours: number;
      totalVideos: number;
      totalHours: number;
      completedReadings: number;
      completedPages: number;
      totalReadings: number;
      totalPages: number;
    }
  > = {};

  let totalAllVideos = 0;
  let totalAllHours = 0;
  let totalAllReadings = 0;
  let totalAllPages = 0;

  categories.forEach((cat) => {
    const categoryName = cat.slug || cat.name;

    let catTotalVideos = 0;
    let catTotalReadings = 0;
    let catTotalPages = 0;

    cat.courses?.forEach((course) => {
      if (course.type === 'reading') {
        catTotalReadings += course.total_videos || 0;
      } else {
        catTotalVideos += course.total_videos || 0;
      }
      catTotalPages += course.total_pages || 0;
    });

    categoryStats[categoryName] = {
      completedVideos: 0,
      completedHours: 0,
      totalVideos: catTotalVideos,
      totalHours: Number(cat.total_hours) || 0,
      completedReadings: 0,
      completedPages: 0,
      totalReadings: catTotalReadings,
      totalPages: catTotalPages,
    };

    totalAllVideos += catTotalVideos;
    totalAllHours += cat.total_hours || 0;
    totalAllReadings += catTotalReadings;
    totalAllPages += catTotalPages;
  });

  return {
    categoryStats,
    totalAllVideos,
    totalAllHours,
    totalAllReadings,
    totalAllPages,
  };
};
