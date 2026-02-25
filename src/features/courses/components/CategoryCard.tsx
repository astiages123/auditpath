import { TvMinimalPlay, Clock, ChevronDown, BookOpen } from 'lucide-react';
import { CourseList } from './CourseList';
import { useEffect } from 'react';
import { useCelebration } from '@/shared/hooks/useCelebration';
import { useProgress } from '@/shared/hooks/useProgress';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/stringHelpers';
import { formatDuration, formatDurationShort } from '@/utils/dateUtils';
import { normalizeCategorySlug } from '../utils/categoryHelpers';
import { CATEGORY_THEMES } from '../utils/coursesConfig';

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
  const { Icon } = categoryConfig;
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
        'border-border',
        'bg-card/40',
        isOpen
          ? 'shadow-lg border-white/10 bg-zinc-900/60 backdrop-blur-md'
          : 'hover:shadow-md hover:border-white/10 hover:bg-card/80'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full p-6 lg:p-8 text-left relative z-10 focus:outline-hidden"
      >
        {/* Mobile-only Stats Grid (At the top) */}
        <div className="grid grid-cols-3 gap-2 mb-6 sm:hidden">
          <div className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-2xl bg-surface/40 border border-white/5 text-[10px] font-black text-muted-foreground uppercase tracking-tight shadow-sm">
            <BookOpen className="size-3.5 text-muted-foreground/40" />
            <span className="truncate">{courses.length} Kurs</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-2xl bg-surface/40 border border-white/5 text-[10px] font-black text-muted-foreground uppercase tracking-tight shadow-sm">
            <TvMinimalPlay className="size-3.5 text-muted-foreground/40" />
            <span className="truncate">
              {displayCompletedVideos}/{displayTotalVideos}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-2xl bg-surface/40 border border-white/5 text-[10px] font-black text-muted-foreground uppercase tracking-tight shadow-sm">
            <Clock className="size-3.5 text-muted-foreground/40" />
            <span className="truncate">
              {formatDurationShort(displayCompletedHours)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div
              className={cn(
                'flex items-center justify-center h-12 w-12 rounded-xl bg-muted border border-white/5 shadow-md group-hover:scale-105 transition-transform',
                'text-accent'
              )}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {name}
              </h3>
              <div className="hidden sm:flex items-center gap-2 mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider overflow-x-auto scrollbar-hide no-scrollbar">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface/50 border border-white/5 whitespace-nowrap">
                  <BookOpen className="size-3 text-muted-foreground/60" />
                  {courses.length} Kurs
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface/50 border border-white/5 whitespace-nowrap">
                  <TvMinimalPlay className="size-3 text-muted-foreground/60" />
                  {displayCompletedVideos}/{displayTotalVideos}
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface/50 border border-white/5 whitespace-nowrap">
                  <Clock className="size-3 text-muted-foreground/60" />
                  {formatDuration(displayCompletedHours)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-lg sm:text-xl font-black text-white leading-none">
                %{progress}
              </span>
              <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-0.5 sm:mt-1">
                İlerleme
              </p>
            </div>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              className="p-2 rounded-xl bg-surface border border-white/5 text-muted-foreground group-hover:text-white transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>
        </div>

        {/* Minimal Progress Bar - unified accent color */}
        <div className="mt-8 h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-primary"
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
                  (a, b) =>
                    (a.sort_order || 0) - (b.sort_order || 0) ||
                    a.name.localeCompare(b.name)
                )}
                categoryColor="text-accent"
                categoryBgColor="bg-surface"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
