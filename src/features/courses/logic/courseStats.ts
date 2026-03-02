import coursesData from '@/features/courses/services/courses.json';

export interface Course {
  id: string;
  type?: string;
  totalVideos: number;
  totalHours: number;
  total_pages?: number;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  courses: Course[];
}

export const calculateStaticTotals = () => {
  const categories = coursesData as Category[];
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
    const categoryName =
      cat.slug || cat.name.split(' (')[0].split('. ')[1] || cat.name;

    let catTotalVideos = 0;
    let catTotalHours = 0;
    let catTotalReadings = 0;
    let catTotalPages = 0;

    cat.courses.forEach((course) => {
      // type video olarak varsayılır, reading ise text olarak sayılır
      if (course.type === 'reading') {
        catTotalReadings += course.totalVideos || 0;
        catTotalPages += course.total_pages || 0;
        // İsteğe bağlı olarak okuma saatini de `catTotalHours`a katabiliriz.
        // Biz metrikleri 4'e ayıracağımız için saatleri de genel ilerlemede hesaba katıyoruz.
        catTotalHours += course.totalHours || 0;
      } else {
        catTotalVideos += course.totalVideos || 0;
        catTotalHours += course.totalHours || 0;
      }
    });

    categoryStats[categoryName] = {
      completedVideos: 0,
      completedHours: 0,
      totalVideos: catTotalVideos,
      totalHours: catTotalHours,
      completedReadings: 0,
      completedPages: 0,
      totalReadings: catTotalReadings,
      totalPages: catTotalPages,
    };

    totalAllVideos += catTotalVideos;
    totalAllHours += catTotalHours;
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
