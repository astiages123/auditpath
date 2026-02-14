import coursesData from "@/features/courses/data/courses.json";

export interface Course {
    id: string;
    totalVideos: number;
    totalHours: number;
}

export interface Category {
    category: string;
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
        }
    > = {};

    let totalAllVideos = 0;
    let totalAllHours = 0;

    categories.forEach((cat) => {
        // Falls back to parsing if slug is missing to prevent crash, though slug should be there now.
        const categoryName = cat.slug ||
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
