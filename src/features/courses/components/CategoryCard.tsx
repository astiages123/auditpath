import { TvMinimalPlay, Clock, ChevronDown, BookOpen } from 'lucide-react';
import { CourseList } from './CourseList';
import { useEffect } from 'react';
import { useCelebration } from '@/shared/hooks/useCelebration';
import { useProgress } from '@/shared/hooks/useProgress';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/core';
import { formatDuration } from '@/utils/formatters';
import { normalizeCategorySlug } from '../utils/categoryHelpers';

import { CATEGORY_THEMES, COURSE_THEME_CONFIG } from '../utils/coursesConfig';

import { type Course } from '@/features/courses/types/courseTypes';

interface CategoryCardProps {
  id: string;
  name: string;
  slug: string;
  totalHours: number | null;
  courses: Course[];
  completedVideos: number;
  completedHours: number;
  // completedCourses: number;
  isOpen: boolean;
  onToggle: () => void;
}

export function CategoryCard({
  name,
  totalHours: initialTotalHours,
  courses,
  completedVideos: initialCompletedVideos,
  completedHours: initialCompletedHours,
  // completedCourses: _completedCourses, // Unused
  isOpen,
  onToggle,
}: CategoryCardProps) {
  // Use config for styles
  const categoryConfig = CATEGORY_THEMES[name] || CATEGORY_THEMES['EKONOMİ'];
  const { Icon, theme: themeKey } = categoryConfig;
  const theme = COURSE_THEME_CONFIG[themeKey];
  const { stats } = useProgress();
  const { triggerCategoryCelebration, revokeCategoryCelebration } =
    useCelebration();

  const categoryName = name.split(' (')[0];
  const normalizedSlug = normalizeCategorySlug(categoryName);
  const catStats =
    stats.categoryProgress[normalizedSlug] ||
    stats.categoryProgress[categoryName] ||
    stats.categoryProgress[name];

  const displayCompletedVideos =
    catStats?.completedVideos ?? initialCompletedVideos;
  const displayTotalVideos = courses.reduce(
    (acc, course) => acc + (course.total_videos || 0),
    0
  );
  const displayCompletedHours =
    catStats?.completedHours ?? initialCompletedHours;
  const displayTotalHours = initialTotalHours || (catStats?.totalHours ?? 0);

  const progress =
    displayTotalHours > 0
      ? Math.round((displayCompletedHours / displayTotalHours) * 100)
      : 0;

  useEffect(() => {
    if (progress === 100 && displayTotalVideos > 0) {
      triggerCategoryCelebration();
    } else if (progress < 100) {
      revokeCategoryCelebration();
    }
  }, [
    progress,
    displayTotalVideos,
    triggerCategoryCelebration,
    revokeCategoryCelebration,
  ]);

  return (
    <motion.div
      layout
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className={cn(
        'group relative overflow-hidden rounded-3xl border transition-all duration-500',
        theme.border,
        theme.gradient,
        theme.hoverGradient,
        isOpen
          ? 'shadow-2xl border-white/20 bg-zinc-900/40 backdrop-blur-md'
          : 'hover:shadow-lg hover:border-white/20 hover:scale-[1.01]'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full p-6 lg:p-8 text-left relative z-10 focus:outline-hidden"
      >
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div
              className={cn(
                'flex items-center justify-center h-12 w-12 rounded-xl bg-zinc-900 border border-white/5 shadow-md group-hover:scale-105 transition-transform',
                theme.text
              )}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {name}
              </h3>
              <div className="flex items-center gap-4 mt-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {courses.length} Kurs
                </span>
                <span className="flex items-center gap-1.5">
                  <TvMinimalPlay className="w-3.5 h-3.5" />
                  {displayCompletedVideos}/{displayTotalVideos}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(displayCompletedHours)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xl font-black text-white leading-none">
                %{progress}
              </span>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-1">
                İlerleme
              </p>
            </div>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              className="p-2 rounded-xl bg-white/5 border border-white/5 text-muted-foreground group-hover:text-white transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>
        </div>

        {/* Minimal Progress Bar - assuming progress bar is same color as text but bg-solid */}
        <div className="mt-8 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              theme.text.replace('text-', 'bg-')
            )}
          />
        </div>
      </button>

      {/* Course List Expansion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="border-t border-white/5 bg-black/10"
          >
            <div className="p-4 lg:p-5">
              <CourseList
                courses={[...courses].sort(
                  (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
                )}
                categoryColor={theme.text}
                categoryBgColor="bg-white/5"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
