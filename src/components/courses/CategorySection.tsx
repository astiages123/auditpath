"use client";

import { Clock, BookOpen } from "lucide-react";
import { CourseCard } from "./CourseCard";
import { Progress } from "@/components/ui/progress";

interface Video {
  id: string;
  videoNumber: number;
  title: string;
  duration: string;
  durationMinutes: number;
}

interface Course {
  id: string;
  courseId: string;
  name: string;
  instructor: string;
  totalVideos: number;
  totalHours: number;
  playlistUrl?: string | null;
  videos?: Video[];
  _count?: {
    videos: number;
  };
}

interface CategorySectionProps {
  name: string;
  slug: string;
  totalHours: number;
  courses: Course[];
  completedMinutes?: number;
  order?: number;
}

// Category color mapping
const categoryColors: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  ekonomi: {
    bg: "bg-chart-1/10",
    border: "border-chart-1/30",
    text: "text-chart-1",
  },
  hukuk: {
    bg: "bg-chart-2/10",
    border: "border-chart-2/30",
    text: "text-chart-2",
  },
  muhasebe: {
    bg: "bg-chart-3/10",
    border: "border-chart-3/30",
    text: "text-chart-3",
  },
};

export function CategorySection({
  name,
  slug,
  totalHours,
  courses,
  completedMinutes = 0,
  order = 0,
}: CategorySectionProps) {
  const colors = categoryColors[slug] || categoryColors.ekonomi;
  const totalMinutes = totalHours * 60;
  const progressPercent =
    totalMinutes > 0 ? (completedMinutes / totalMinutes) * 100 : 0;

  // Format hours
  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m} dk`;
    return `${h} saat`;
  };

  return (
    <section
      className="animate-fade-in"
      style={{ animationDelay: `${order * 100}ms` }}
    >
      {/* Category Header */}
      <div
        className={`rounded-xl p-4 md:p-6 mb-4 ${colors.bg} border ${colors.border}`}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg bg-background/80`}
            >
              <BookOpen className={`h-5 w-5 ${colors.text}`} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">{name}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                <span>{courses.length} ders</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatHours(totalHours)}
                </span>
              </div>
            </div>
          </div>

          {/* Category Progress */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <Progress value={progressPercent} className="flex-1 h-2" />
            <span className={`text-sm font-semibold ${colors.text}`}>
              %{Math.round(progressPercent)}
            </span>
          </div>
        </div>
      </div>

      {/* Courses Grid - Bento Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {courses.map((course, index) => (
          <CourseCard
            key={course.id}
            id={course.id}
            courseId={course.courseId}
            name={course.name}
            instructor={course.instructor}
            totalVideos={course.totalVideos}
            totalHours={course.totalHours}
            variant={index === 0 ? "large" : "default"}
          />
        ))}
      </div>
    </section>
  );
}
