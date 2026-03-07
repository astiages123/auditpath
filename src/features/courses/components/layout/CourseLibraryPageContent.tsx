import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle2, FileText } from 'lucide-react';
import type { Course } from '@/features/courses/types/courseTypes';
import { getCourseIcon } from '@/features/courses/logic/coursesLogic';
import { normalizeCategorySlug } from '@/features/courses/utils/categoryHelpers';
import { CATEGORY_THEMES } from '@/features/courses/utils/coursesConfig';
import type { CourseLibraryStats } from '@/features/courses/hooks/useCourseLibraryData';
import { useCourseLibraryPageLogic } from '@/features/courses/hooks/useCourseLibraryPageLogic';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { cn } from '@/utils/stringHelpers';

const formatDuration = (hours: number | null): string => {
  if (!hours) return '—';
  const wholeHours = Math.floor(hours);
  const remainingMinutes = Math.round((hours - wholeHours) * 60);
  const parts = [];
  if (wholeHours > 0) parts.push(`${wholeHours} sa`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes} dk`);
  return parts.join(' ') || '—';
};

function CourseRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-card/30 border border-border/20 animate-pulse">
      <div className="w-9 h-9 rounded-xl bg-muted/30 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 bg-muted/30 rounded w-48" />
        <div className="h-2.5 bg-muted/20 rounded w-28" />
      </div>
      <div className="hidden md:flex items-center gap-6">
        <div className="w-28 space-y-1.5">
          <div className="h-1.5 bg-muted/20 rounded-full" />
          <div className="h-1.5 bg-muted/20 rounded-full" />
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-muted/20" />
        <div className="w-24 h-8 rounded-xl bg-muted/20" />
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 bg-muted/20 rounded w-56" />
        <div className="h-4 bg-muted/10 rounded w-72" />
      </div>
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={`skeleton-tab-${i}`}
            className="h-14 w-36 rounded-2xl bg-muted/15 shrink-0"
          />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <CourseRowSkeleton key={`skeleton-row-${i}`} />
        ))}
      </div>
    </div>
  );
}

function ProgressCell({
  value,
  label,
  colorClass,
  trackClass,
}: {
  value: number;
  label: string;
  colorClass: string;
  trackClass: string;
}) {
  const done = value >= 100;
  return (
    <div className="w-[130px] space-y-2 shrink-0">
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {done ? (
          <CheckCircle2 className="size-3.5 text-emerald-500" />
        ) : (
          <span className="text-xs font-bold text-foreground/70">%{value}</span>
        )}
      </div>
      {done ? (
        <div className="h-2 rounded-full bg-emerald-500/30">
          <div className="h-full w-full rounded-full bg-emerald-500" />
        </div>
      ) : (
        <div className={cn('h-2 rounded-full', trackClass)}>
          <div
            style={{ width: `${value}%` }}
            className={cn(
              'h-full rounded-full transition-all duration-700',
              colorClass
            )}
          />
        </div>
      )}
    </div>
  );
}

function CourseRow({
  course,
  stats,
  onNotes,
  onQuiz,
}: {
  course: Course;
  stats?: CourseLibraryStats;
  onNotes: (course: Course) => void;
  onQuiz: (course: Course) => void;
}) {
  const videoProgress = stats?.videoProgress ?? 0;
  const mastery = stats?.averageMastery ?? 0;
  const handleNotesClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onNotes(course);
  };

  const handleQuizClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onQuiz(course);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'group flex items-center gap-4 px-5 py-4 rounded-2xl',
        'bg-card/30 hover:bg-card/60 border border-border/20 hover:border-border/40',
        'transition-all duration-200 hover:scale-[1.005] cursor-default'
      )}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/15 transition-transform duration-300 group-hover:scale-110">
        {React.createElement(
          getCourseIcon(course.name, course.course_slug ?? course.id),
          {
            className: 'size-5 text-primary',
          }
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-snug truncate group-hover:text-primary transition-colors">
          {course.name}
        </p>
        <p className="text-[11px] text-muted-foreground/90 font-medium mt-0.5">
          {course.total_videos ? `${course.total_videos} video` : '—'}
          {course.total_hours ? ` • ${formatDuration(course.total_hours)}` : ''}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-5 shrink-0">
        <ProgressCell
          value={videoProgress}
          label="Video"
          colorClass="bg-primary"
          trackClass="bg-primary/10"
        />
        <ProgressCell
          value={mastery}
          label="Ustalık"
          colorClass="bg-emerald-500"
          trackClass="bg-emerald-500/10"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleNotesClick}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-200 shrink-0 border border-border/40 bg-primary/10 text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 hover:scale-[1.04]"
        >
          <FileText className="size-3" />
          <span className="hidden sm:inline">Notları Aç</span>
        </button>

        <button
          onClick={handleQuizClick}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-200 shrink-0 bg-primary/10 text-foreground border border-primary/20 hover:bg-primary/20 hover:border-primary/40 hover:scale-[1.04]"
        >
          <Brain className="size-3" />
          <span className="hidden sm:inline">Sınava Gir</span>
        </button>
      </div>
    </motion.div>
  );
}

export function CourseLibraryPageContent() {
  const {
    categories,
    dashboardStats,
    loading: isLoading,
    activeCategoryIndex,
    setActiveCategoryIndex,
    activeCategory,
    activeTheme,
    activeThemeConfig,
    sortedCourses,
    navigateToNotes,
    navigateToQuiz,
  } = useCourseLibraryPageLogic();

  return (
    <PageContainer isLoading={isLoading} loadingFallback={<PageSkeleton />}>
      <div className="flex flex-col min-h-full overflow-y-auto custom-scrollbar px-4 lg:px-6">
        <div className="shrink-0">
          <PageHeader
            title="Çalışma Merkezi"
            subtitle="Notlar ve sınavlar, tek ekranda."
          />
        </div>

        <div
          className="flex lg:grid gap-3 mb-8 shrink-0 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0"
          style={
            {
              gridTemplateColumns: `repeat(${categories.length}, 1fr)`,
            } as React.CSSProperties
          }
        >
          {categories.map((category, idx) => {
            const normalizedSlug = normalizeCategorySlug(category.name);
            const theme =
              CATEGORY_THEMES[normalizedSlug] ||
              CATEGORY_THEMES[category.slug] ||
              CATEGORY_THEMES[category.name.toUpperCase()] ||
              Object.values(CATEGORY_THEMES)[0];
            const CatIcon = theme?.Icon ?? Brain;
            const isActive = idx === activeCategoryIndex;

            return (
              <button
                key={category.id}
                onClick={() => setActiveCategoryIndex(idx)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 shrink-0 min-w-[100px] lg:min-w-0',
                  'px-4 py-4 rounded-2xl transition-all duration-300',
                  'text-center group',
                  isActive
                    ? 'bg-card text-foreground'
                    : 'bg-card/40 text-foreground hover:bg-card hover:text-foreground/80'
                )}
              >
                <CatIcon
                  className={cn(
                    'size-6 transition-colors',
                    isActive ? 'text-foreground' : 'text-foreground'
                  )}
                />
                <span
                  className={cn(
                    'text-[11px] font-bold uppercase tracking-widest leading-tight',
                    isActive ? 'text-foreground' : 'text-foreground'
                  )}
                >
                  {category.name}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-medium tabular-nums',
                    isActive ? 'text-foreground' : 'text-foreground'
                  )}
                >
                  {category.courses.length} ders
                </span>
              </button>
            );
          })}
        </div>

        {activeCategory && (
          <div className="flex-1 min-h-0">
            <div className="flex items-center gap-3 mb-5">
              {activeTheme && (
                <div
                  className={cn(
                    'size-10 rounded-xl flex items-center justify-center',
                    activeThemeConfig.bg
                  )}
                >
                  <activeTheme.Icon
                    className={cn('size-5', activeThemeConfig.text)}
                  />
                </div>
              )}
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-foreground">
                  {activeCategory.name}
                </h2>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {sortedCourses.length} ders · seçili kategori
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategoryIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-2.5 pb-8"
              >
                {sortedCourses.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <p className="text-sm">Bu kategoride henüz ders yok.</p>
                  </div>
                ) : (
                  sortedCourses.map((course) => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      stats={dashboardStats[course.id]}
                      onNotes={navigateToNotes}
                      onQuiz={navigateToQuiz}
                    />
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
