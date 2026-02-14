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
import { VideoList } from './video-list.component';
import { formatDuration } from '@/utils/core';
import { useProgress } from '@/hooks/use-progress';
import { getCourseIcon } from './courses-logic';
import { useCelebration } from '@/hooks/use-celebration';
import { type Course } from '@/types';

// Lazy load modals to reduce initial bundle size and split CSS (Katex)
const QuizModal = lazy(() =>
  import('@/features/quiz/quiz-modal.component').then((module) => ({
    default: module.QuizModal,
  }))
);
const CourseStatsModal = lazy(() =>
  import('./course-stats-modal.component').then((module) => ({
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

        return (
          <div
            key={course.id}
            className={`rounded-xl border overflow-hidden transition-all duration-500 group
                ${
                  isCompleted
                    ? 'border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/70 shadow-[0_0_15px_-5px_var(--color-amber-500)]'
                    : 'border-border/50 bg-background/30 hover:border-border/80 hover:bg-background/50'
                }`}
          >
            {/* Course Header */}
            <div className="flex items-center p-4 gap-4">
              {/* Left Section: Icon & Info */}
              <div
                className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                onClick={() =>
                  setExpandedCourse(
                    expandedCourse === course.id ? null : course.id
                  )
                }
              >
                {/* Icon */}
                <div
                  className={`p-3 rounded-xl shrink-0 transition-transform duration-500 group-hover:scale-110 ${isCompleted ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' : `${categoryBgColor} ${categoryColor}`}`}
                >
                  <Icon
                    className={`h-6 w-6 ${isCompleted ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : categoryColor}`}
                  />
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`font-bold text-base truncate transition-colors ${isCompleted ? 'text-amber-200' : 'text-zinc-100'}`}
                    >
                      {displayName}
                    </h4>
                    <span
                      className={`text-sm font-bold ${isCompleted ? 'text-amber-400' : categoryColor}`}
                    >
                      %{progress}
                    </span>
                    {isCompleted && (
                      <div className="bg-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                        Tamamlandı
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(totalHours)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TvMinimalPlay className="h-3 w-3" />
                      <span>{totalVideos} Video</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Section: Action Buttons */}
              <div className="flex items-center bg-zinc-900/50 border border-white/5 p-1 rounded-xl gap-1 shrink-0">
                {/* Youtube Button */}
                {course.playlist_url ? (
                  <a
                    href={course.playlist_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-white/10 transition-all"
                    title="Youtube Oynatma Listesi"
                  >
                    <Youtube className="h-5 w-5" />
                  </a>
                ) : (
                  <button
                    disabled
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-700 cursor-not-allowed"
                  >
                    <Youtube className="h-5 w-5" />
                  </button>
                )}

                {/* Note Button */}
                <Link
                  to={`/notes/${course.course_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-blue-400 hover:bg-white/10 transition-all"
                  title="Ders Notu"
                >
                  <FileText className="h-4 w-4" />
                </Link>

                {/* Quiz Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedQuizCourse(course);
                  }}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-purple-400 hover:bg-white/10 transition-all"
                  title="Quiz & Soru Üret"
                >
                  <Brain className="h-4 w-4" />
                </button>

                {/* Stats Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStatsCourse(course);
                  }}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-orange-400 hover:bg-white/10 transition-all"
                  title="İstatistik"
                >
                  <BarChart2 className="h-4 w-4" />
                </button>
              </div>

              {/* Right Section: Chevron */}
              <button
                onClick={() =>
                  setExpandedCourse(
                    expandedCourse === course.id ? null : course.id
                  )
                }
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-800/50 text-muted-foreground hover:bg-zinc-800 hover:text-foreground transition-all shrink-0"
              >
                {expandedCourse === course.id ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Expanded Video List */}
            {expandedCourse === course.id && (
              <div className="border-t border-border/50">
                <VideoList
                  courseId={course.course_slug}
                  dbCourseId={course.id}
                  categoryColor={categoryColor}
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
