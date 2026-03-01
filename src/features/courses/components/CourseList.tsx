import { useState, useEffect, lazy, Suspense } from 'react';
import {
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Clock,
  TvMinimalPlay,
  Youtube,
  BookOpen,
  BookOpenText,
} from 'lucide-react';
import { VideoList } from './VideoList';
import { formatDurationShort } from '@/utils/dateUtils';
import { useProgress } from '@/shared/hooks/useProgress';
import { useCelebration } from '@/shared/hooks/useCelebration';
import { getCourseIcon } from '../logic/coursesLogic';
import { type Course } from '@/features/courses/types/courseTypes';
import { cn } from '@/utils/stringHelpers';

// Lazy load CourseStatsModal
const CourseStatsModal = lazy(() =>
  import('./CourseStatsModal').then((module) => ({
    default: module.CourseStatsModal,
  }))
);

interface CourseListProps {
  courses: Course[];
  categoryColor: string;
  categoryBgColor: string;
  slug?: string;
}

// Helper to remove instructor name (everything after " - ")
const cleanCourseName = (name: string) => {
  return name.split(' - ')[0];
};

export function CourseList({
  courses,
  categoryColor,
  categoryBgColor,
  slug: _slug,
}: CourseListProps) {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const { stats } = useProgress();
  const [selectedStatsCourse, setSelectedStatsCourse] = useState<Course | null>(
    null
  );

  // No local hydration needed, useProgress handles loading state if necessary

  // Celebration Hook
  const { triggerCourseCelebration, revokeCourseCelebration } =
    useCelebration();

  // Check for course completions/un-completions
  useEffect(() => {
    courses.forEach((course) => {
      const totalVideos = course.total_videos || 0;
      const completed = stats.courseProgress[course.course_slug] || 0;
      const isFinished = totalVideos > 0 && completed === totalVideos;

      if (isFinished) {
        triggerCourseCelebration();
      } else if (completed < totalVideos) {
        revokeCourseCelebration();
      }
    });
  }, [
    courses,
    stats.courseProgress,
    triggerCourseCelebration,
    revokeCourseCelebration,
  ]);

  return (
    <div className="space-y-3">
      {courses.map((course) => {
        const Icon =
          getCourseIcon(course.name, course.course_slug) || GraduationCap;
        const displayName = cleanCourseName(course.name);

        const totalVideos = course.total_videos || 0;
        const totalHours = course.total_hours || 0;

        // Calculate progress from context
        const completed = stats.courseProgress[course.course_slug] || 0;
        const progress =
          totalVideos > 0 ? Math.round((completed / totalVideos) * 100) : 0;
        const isCompleted = progress === 100 && totalVideos > 0;

        const courseCardClass = cn(
          'rounded-xl border overflow-hidden transition-all duration-200 group',
          isCompleted
            ? 'border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary/70 shadow-[0_0_15px_-5px_rgba(var(--primary),0.5)]'
            : 'border-white/5 bg-card/40 hover:border-white/30 hover:bg-card/60'
        );

        const iconContainerClass = cn(
          'p-3 rounded-xl shrink-0 transition-transform duration-500 group-hover:scale-110',
          isCompleted
            ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
            : `${categoryBgColor} ${categoryColor}`
        );

        const iconClass = cn(
          'size-6',
          isCompleted
            ? 'text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]'
            : categoryColor
        );

        const titleClass = cn(
          'font-bold text-sm sm:text-base leading-tight transition-colors line-clamp-2',
          isCompleted ? 'text-primary-foreground' : 'text-zinc-100'
        );

        return (
          <div key={course.id} className={courseCardClass}>
            {/* Main Content Area */}
            <div
              className="flex items-center gap-4 p-5 cursor-pointer"
              onClick={() =>
                setExpandedCourse(
                  expandedCourse === course.id ? null : course.id
                )
              }
            >
              {/* Column 1: Icon */}
              <div className={iconContainerClass}>
                <Icon className={iconClass} />
              </div>

              {/* Column 2: Name + Stats (Time, Videos, Youtube) */}
              <div className="flex-1 min-w-0">
                <h4 className={titleClass}>{displayName}</h4>

                <div className="flex items-center gap-3 mt-1.5 overflow-x-auto no-scrollbar scrollbar-hide">
                  {course.type === 'reading' ? (
                    <>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        <BookOpen className="size-3 text-muted-foreground/50" />
                        {totalVideos} Konu
                      </div>
                      {course.total_pages && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          <BookOpenText className="size-3 text-muted-foreground/50" />
                          {course.total_pages} Sayfa
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        <Clock className="size-3 text-muted-foreground/50" />
                        {formatDurationShort(totalHours)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        <TvMinimalPlay className="size-3 text-muted-foreground/50" />
                        {totalVideos} Video
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Column 3: Progress % + Toggle Icon */}
              <div className="flex items-center gap-4 shrink-0">
                {course.type === 'reading' ? (
                  [
                    'turk-dis-politikasi',
                    'uluslararasi-hukuk',
                    'uluslararasi-iliskiler-kuramlari',
                  ].includes(course.course_slug) ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex flex-col items-center gap-0.5 text-blue-400 hover:text-blue-300 transition-colors p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://ccnvhimlbkkydpcqtraw.supabase.co/storage/v1/object/public/pdfs/${course.course_slug}-1.pdf`,
                            '_blank'
                          );
                        }}
                      >
                        <BookOpenText className="size-[18px]" />
                        <span className="text-[9px] font-bold leading-none mt-0.5">
                          C1
                        </span>
                      </button>
                      <button
                        type="button"
                        className="flex flex-col items-center gap-0.5 text-blue-400 hover:text-blue-300 transition-colors p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://ccnvhimlbkkydpcqtraw.supabase.co/storage/v1/object/public/pdfs/${course.course_slug}-2.pdf`,
                            '_blank'
                          );
                        }}
                      >
                        <BookOpenText className="size-[18px]" />
                        <span className="text-[9px] font-bold leading-none mt-0.5">
                          C2
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-blue-400 hover:text-blue-300 transition-colors p-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `https://ccnvhimlbkkydpcqtraw.supabase.co/storage/v1/object/public/pdfs/${course.course_slug}.pdf`,
                          '_blank'
                        );
                      }}
                    >
                      <BookOpenText className="size-5" />
                    </button>
                  )
                ) : course.playlist_url ? (
                  <button
                    type="button"
                    className="text-red-400 hover:text-red-300 transition-colors p-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(course.playlist_url!, '_blank');
                    }}
                  >
                    <Youtube className="size-5" />
                  </button>
                ) : null}

                <div className="text-right">
                  <span
                    className={cn(
                      'text-lg font-black leading-none',
                      isCompleted ? 'text-primary' : categoryColor
                    )}
                  >
                    %{progress}
                  </span>
                  <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-0.5">
                    İlerleme
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-surface/50 border border-white/5 text-muted-foreground group-hover:text-white transition-colors">
                  {expandedCourse === course.id ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar - Full Width at Bottom */}
            <div className="px-5 pb-5">
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${progress}%` }}
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    'bg-primary'
                  )}
                />
              </div>
            </div>

            {/* Expanded Video List */}
            {expandedCourse === course.id && (
              <div className="border-t border-border/50">
                <VideoList
                  courseId={course.course_slug}
                  dbCourseId={course.id}
                  _categoryColor={categoryColor}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Stats Modal */}
      <Suspense
        fallback={<div className="fixed inset-0 bg-transparent z-9999" />}
      >
        {selectedStatsCourse && (
          <CourseStatsModal
            open={!!selectedStatsCourse}
            onOpenChange={(open: boolean) =>
              !open && setSelectedStatsCourse(null)
            }
            courseName={selectedStatsCourse.name}
            totalVideos={selectedStatsCourse.total_videos || 0}
            completedVideos={0}
            totalHours={selectedStatsCourse.total_hours || 0}
            spentHours={0}
          />
        )}
      </Suspense>
    </div>
  );
}
