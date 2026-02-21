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
import { formatDurationShort } from '@/utils/formatters';
import { useProgress } from '@/shared/hooks/useProgress';
import { useCelebration } from '@/shared/hooks/useCelebration';
import { getCourseIcon } from '../logic/coursesLogic';
import { type Course } from '@/features/courses/types/courseTypes';
import { cn } from '@/utils/stringHelpers';

// Lazy load modals to reduce initial bundle size and split CSS (Katex)
const QuizModal = lazy(() =>
  import('@/features/quiz/components').then((module) => ({
    default: module.QuizModal,
  }))
);
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
  const [selectedQuizCourse, setSelectedQuizCourse] = useState<Course | null>(
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
        const Icon = getCourseIcon(course.name) || GraduationCap;
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
            ? 'border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/70 shadow-[0_0_15px_-5px_var(--color-amber-500)]'
            : 'border-white/5 bg-zinc-900/40 hover:border-white/30 hover:bg-zinc-900/60'
        );

        const iconContainerClass = cn(
          'p-3 rounded-xl shrink-0 transition-transform duration-500 group-hover:scale-110',
          isCompleted
            ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
            : `${categoryBgColor} ${categoryColor}`
        );

        const iconClass = cn(
          'h-6 w-6 sm:h-6 sm:w-6',
          isCompleted
            ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
            : categoryColor
        );

        const titleClass = cn(
          'font-bold text-sm sm:text-base leading-tight transition-colors line-clamp-2',
          isCompleted ? 'text-amber-200' : 'text-zinc-100'
        );

        const progressTextClass = cn(
          'text-sm font-bold ml-auto sm:ml-0 shrink-0',
          isCompleted ? 'text-amber-400' : categoryColor
        );

        const completedBadgeClass = cn(
          'bg-amber-500/20 px-1.5 sm:px-2 py-0.5 rounded text-[10px]',
          'font-bold text-amber-400 border border-amber-500/30 uppercase tracking-wide shrink-0'
        );

        return (
          <div key={course.id} className={courseCardClass}>
            {/* Course Header */}
            <div className="flex flex-col sm:flex-row p-4 gap-4 w-full">
              {/* Top Row: Icon, Info, Toggle (in mobile row, left flex in desktop) */}
              <div
                className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                onClick={() =>
                  setExpandedCourse(
                    expandedCourse === course.id ? null : course.id
                  )
                }
              >
                {/* Icon */}
                <div className={iconContainerClass}>
                  <Icon className={iconClass} />
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={titleClass}>{displayName}</h4>
                    <span className={progressTextClass}>%{progress}</span>
                    {isCompleted && (
                      <div className={completedBadgeClass}>Tamam</div>
                    )}
                  </div>
                  <div className="flex items-center gap-8 sm:gap-3 text-zinc-100 sm:text-zinc-400 flex-1">
                    {/* Time Stat */}
                    <div className="flex items-center gap-2 sm:gap-1 whitespace-nowrap">
                      <Clock className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground/40" />
                      <span className="text-sm sm:text-xs font-bold sm:font-medium tracking-tight">
                        {formatDurationShort(totalHours)}
                      </span>
                    </div>
                    {/* Divider pill - visible only on mobile */}
                    <div className="h-6 w-px bg-surface mx-1 sm:hidden" />
                    {/* Video Stat */}
                    <div className="flex items-center gap-2 sm:gap-1 whitespace-nowrap">
                      <TvMinimalPlay className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground/40" />
                      <span className="text-sm sm:text-xs font-bold sm:font-medium tracking-tight">
                        {totalVideos}{' '}
                        <span className="hidden sm:inline">Video</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mobile Chevron (visible only on small if we put buttons below) */}
                <button className="sm:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-surface text-muted-foreground border border-white/5 shrink-0">
                  {expandedCourse === course.id ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Bottom Row: Actions */}
              <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-start">
                <div className="flex items-center bg-zinc-900/50 border border-white/5 p-1 rounded-xl gap-1 flex-1 justify-center sm:justify-start">
                  {/* Youtube Button */}
                  {course.playlist_url ? (
                    <a
                      href={course.playlist_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-surface-hover transition-all"
                      title="Youtube Oynatma Listesi"
                    >
                      <Youtube className="h-5 w-5" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg text-zinc-700 cursor-not-allowed"
                    >
                      <Youtube className="h-5 w-5" />
                    </button>
                  )}

                  {/* Note Button */}
                  <Link
                    to={`/notes/${course.course_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg text-blue-400 hover:bg-surface-hover transition-all"
                    title="Ders Notu"
                  >
                    <FileText className="h-4 w-4 sm:h-4 sm:w-4" />
                  </Link>

                  {/* Quiz Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedQuizCourse(course);
                    }}
                    className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg text-purple-400 hover:bg-surface-hover transition-all"
                    title="Quiz & Soru Üret"
                  >
                    <Brain className="h-4 w-4 sm:h-4 sm:w-4" />
                  </button>

                  {/* Stats Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStatsCourse(course);
                    }}
                    className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg text-orange-400 hover:bg-surface-hover transition-all"
                    title="İstatistik"
                  >
                    <BarChart2 className="h-4 w-4 sm:h-4 sm:w-4" />
                  </button>
                </div>

                {/* Desktop Chevron */}
                <button
                  onClick={() =>
                    setExpandedCourse(
                      expandedCourse === course.id ? null : course.id
                    )
                  }
                  className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-muted-foreground hover:bg-zinc-800 hover:text-foreground transition-all shrink-0 border border-transparent hover:border-white/5"
                >
                  {expandedCourse === course.id ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
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

        {/* Quiz Modal */}
        {selectedQuizCourse && (
          <QuizModal
            isOpen={!!selectedQuizCourse}
            onOpenChange={(open: boolean) =>
              !open && setSelectedQuizCourse(null)
            }
            courseId={selectedQuizCourse.id}
            courseName={selectedQuizCourse.name}
          />
        )}
      </Suspense>
    </div>
  );
}
