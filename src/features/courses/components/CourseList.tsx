import { Link } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import {
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Clock,
  TvMinimalPlay,
  Youtube,
  FileText,
  BarChart2,
  Brain,
} from 'lucide-react';
import { VideoList } from './VideoList';
import { formatDurationShort } from '@/utils/dateUtils';
import { useProgress } from '@/shared/hooks/useProgress';
import { useCelebration } from '@/shared/hooks/useCelebration';
import { getCourseIcon } from '../logic/coursesLogic';
import { type Course } from '@/features/courses/types/courseTypes';
import { cn } from '@/utils/stringHelpers';
import { ROUTES } from '@/utils/routes';

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
}

// Helper to remove instructor name (everything after " - ")
const cleanCourseName = (name: string) => {
  return name.split(' - ')[0];
};

export function CourseList({
  courses,
  categoryColor,
  categoryBgColor,
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

        const progressTextClass = cn(
          'text-sm font-bold ml-auto sm:ml-0 shrink-0',
          isCompleted ? 'text-primary' : categoryColor
        );

        const completedBadgeClass = cn(
          'bg-primary/20 px-1.5 sm:px-2 py-0.5 rounded text-[10px]',
          'font-bold text-primary border border-primary/30 uppercase tracking-wide shrink-0'
        );

        return (
          <div key={course.id} className={courseCardClass}>
            {/* Course Header */}
            <div
              className="flex flex-col p-5 gap-4 w-full cursor-pointer"
              onClick={() =>
                setExpandedCourse(
                  expandedCourse === course.id ? null : course.id
                )
              }
            >
              {/* Top Row: Badges */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[10px] text-white font-bold uppercase tracking-widest text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border/40">
                  <Clock className="size-3.5 text-muted-foreground/50" />
                  {formatDurationShort(totalHours)}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-white font-bold uppercase tracking-widest text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border/40">
                  <TvMinimalPlay className="size-3.5 text-muted-foreground/50" />
                  {totalVideos} Video
                </div>
                {isCompleted && (
                  <div className={cn(completedBadgeClass, 'ml-auto')}>
                    Tamam
                  </div>
                )}
              </div>

              {/* Middle Row: Icon, Name, Progress, Toggle */}
              <div className="flex items-center gap-4 min-w-0">
                <div className={iconContainerClass}>
                  <Icon className={iconClass} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={titleClass}>{displayName}</h4>
                    <span className={progressTextClass}>%{progress}</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-2 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${progress}%` }}
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isCompleted ? 'bg-primary' : 'bg-primary'
                      )}
                    />
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {/* Actions (Desktop only here, simplified) */}
                  <div className="hidden sm:flex items-center bg-zinc-900/40 border border-white/5 p-1 rounded-xl gap-0.5">
                    {course.playlist_url && (
                      <a
                        href={course.playlist_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="size-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-surface-hover transition-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Youtube className="size-4" />
                      </a>
                    )}
                    <Link
                      to={`/notes/${course.course_slug}`}
                      className="size-8 flex items-center justify-center rounded-lg text-blue-400 hover:bg-surface-hover transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileText className="size-4" />
                    </Link>
                    <Link
                      to={`${ROUTES.QUIZ}/${course.course_slug}`}
                      className="size-8 flex items-center justify-center rounded-lg text-purple-400 hover:bg-surface-hover transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Brain className="size-4" />
                    </Link>
                  </div>

                  <button className="size-10 flex items-center justify-center rounded-xl bg-surface/50 text-muted-foreground border border-white/5 transition-all">
                    {expandedCourse === course.id ? (
                      <ChevronUp className="size-5" />
                    ) : (
                      <ChevronDown className="size-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bottom Row: Actions (Mobile visible) */}
              <div className="flex sm:hidden items-center bg-zinc-900/40 border border-white/5 p-1 rounded-xl gap-1 w-full justify-around mt-1">
                {course.playlist_url && (
                  <a
                    href={course.playlist_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 flex items-center justify-center rounded-lg text-red-400 hover:bg-surface-hover"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Youtube className="size-5" />
                  </a>
                )}
                <Link
                  to={`/notes/${course.course_slug}`}
                  className="flex-1 py-2 flex items-center justify-center rounded-lg text-blue-400 hover:bg-surface-hover"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileText className="size-5" />
                </Link>
                <Link
                  to={`${ROUTES.QUIZ}/${course.course_slug}`}
                  className="flex-1 py-2 flex items-center justify-center rounded-lg text-purple-400 hover:bg-surface-hover"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Brain className="size-5" />
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStatsCourse(course);
                  }}
                  className="flex-1 py-2 flex items-center justify-center rounded-lg text-primary"
                >
                  <BarChart2 className="size-5" />
                </button>
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
