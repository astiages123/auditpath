import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  FileText,
  LucideIcon,
  Pencil,
} from 'lucide-react';
import { getCategories } from '@/features/courses/services/courseService';
import type { Category, Course } from '@/features/courses/types/courseTypes';
import {
  ICON_OVERRIDES,
  COURSE_KEYWORD_MAPPINGS,
  CATEGORY_THEMES,
  COURSE_THEME_CONFIG,
} from '@/features/courses/utils/coursesConfig';
import { ROUTES } from '@/utils/routes';
import { PageHeader } from '@/shared/components/PageHeader';
import {
  getLandingDashboardData,
  type LandingCourseStats,
} from '@/features/quiz/services/quizLandingService';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/stringHelpers';
import { PageContainer } from '@/components/layout/PageContainer';

// === HELPERS ===

const formatDuration = (hours: number | null): string => {
  if (!hours) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const parts = [];
  if (h > 0) parts.push(`${h} sa`);
  if (m > 0) parts.push(`${m} dk`);
  return parts.join(' ') || '—';
};

const getCourseIcon = (course: Course): LucideIcon => {
  const override = ICON_OVERRIDES.find((o) =>
    course.course_slug.toLowerCase().includes(o.keyword.toLowerCase())
  );
  if (override) return override.icon;

  const mapping = COURSE_KEYWORD_MAPPINGS.find((m) =>
    m.keywords.some((kw) =>
      course.name.toLowerCase().includes(kw.toLowerCase())
    )
  );
  if (mapping) return mapping.icon;

  return BookOpen;
};

// getCourseTheme is not used, keeping it as it might be used later.
/* const getCourseTheme = (course: Course): CourseTheme => {
  const mapping = COURSE_KEYWORD_MAPPINGS.find((m) =>
    m.keywords.some((kw) =>
      course.name.toLowerCase().includes(kw.toLowerCase())
    )
  );
  return mapping?.theme ?? 'primary';
}; */

// === SKELETON ===

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
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-muted/20 rounded w-56" />
        <div className="h-4 bg-muted/10 rounded w-72" />
      </div>
      {/* Tab bar skeleton */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 w-36 rounded-2xl bg-muted/15 shrink-0" />
        ))}
      </div>
      {/* Rows skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <CourseRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// === PROGRESS CELL ===

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

// === COURSE ROW ===

function CourseRow({
  course,
  stats,
  onNotes,
  onQuiz,
}: {
  course: Course;
  stats?: LandingCourseStats;
  onNotes: (c: Course) => void;
  onQuiz: (c: Course) => void;
}) {
  // const Icon = getCourseIcon(course); // Moved inside render to avoid component creation during render error
  const videoProgress = stats?.videoProgress ?? 0;
  const mastery = stats?.averageMastery ?? 0;

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
      {/* İkon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/15 transition-transform duration-300 group-hover:scale-110">
        {React.createElement(getCourseIcon(course), {
          className: 'size-5 text-primary',
        })}
      </div>

      {/* Ders Adı + Meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-snug truncate group-hover:text-primary transition-colors">
          {course.name}
        </p>
        <p className="text-[11px] text-muted-foreground/60 font-medium mt-0.5">
          {course.total_videos ? `${course.total_videos} video` : '—'}
          {course.total_hours ? ` • ${formatDuration(course.total_hours)}` : ''}
        </p>
      </div>

      {/* Progress Barları — gizli mobile */}
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

      {/* Aksiyonlar */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNotes(course);
          }}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-200 shrink-0 border border-border/40 bg-primary/10 text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 hover:scale-[1.04]"
        >
          <FileText className="size-3" />
          <span className="hidden sm:inline">Notları Aç</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuiz(course);
          }}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-200 shrink-0 bg-primary/10 text-foreground border border-primary/20 hover:bg-primary/20 hover:border-primary/40 hover:scale-[1.04]"
        >
          <Pencil className="size-3" />
          <span className="hidden sm:inline">Sınava Gir</span>
        </button>
      </div>
    </motion.div>
  );
}

// === PAGE ===

export default function CourseLibrary() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dashboardStats, setDashboardStats] = useState<
    Record<string, LandingCourseStats>
  >({});
  const [loading, setLoading] = useState(true);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        const [data, stats] = await Promise.all([
          getCategories(),
          userId ? getLandingDashboardData(userId) : Promise.resolve({}),
        ]);

        const sorted = [...data].sort(
          (a, b) =>
            (a.sort_order || 0) - (b.sort_order || 0) ||
            a.name.localeCompare(b.name)
        );

        if (!cancelled) {
          setCategories(sorted);
          setDashboardStats(stats);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCategory = categories[activeCategoryIndex];
  const activeTheme = activeCategory
    ? CATEGORY_THEMES[activeCategory.name.toUpperCase()]
    : undefined;
  const activeThemeConfig = activeTheme
    ? COURSE_THEME_CONFIG[activeTheme.theme]
    : COURSE_THEME_CONFIG['primary'];

  const sortedCourses = [...(activeCategory?.courses ?? [])].sort(
    (a, b) =>
      (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name)
  );

  return (
    <PageContainer isLoading={loading} loadingFallback={<PageSkeleton />}>
      <div className="flex flex-col min-h-full overflow-y-auto custom-scrollbar px-4 lg:px-6">
        {/* Header */}
        <div className="shrink-0">
          <PageHeader
            title="Çalışma Merkezi"
            subtitle="Notlar ve sınavlar, tek ekranda."
          />
        </div>

        {/* === KATEGORİ TAB BAR === */}
        <div
          className="grid gap-3 mb-8 shrink-0"
          style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}
        >
          {categories.map((category, idx) => {
            const theme =
              CATEGORY_THEMES[category.name.toUpperCase()] ||
              CATEGORY_THEMES['İKTİSAT'] ||
              Object.values(CATEGORY_THEMES)[0];
            const CatIcon = theme?.Icon ?? Brain;
            const tc =
              COURSE_THEME_CONFIG[theme.theme] ||
              COURSE_THEME_CONFIG['primary'];
            const isActive = idx === activeCategoryIndex;

            return (
              <button
                key={category.id}
                onClick={() => setActiveCategoryIndex(idx)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 shrink-0',
                  'px-4 py-4 rounded-2xl border transition-all duration-300',
                  'text-center group',
                  isActive
                    ? cn(tc.bg, tc.border, tc.text, 'shadow-xs scale-[1.02]')
                    : 'bg-card/20 border-border/10 text-muted-foreground/70 hover:bg-card hover:border-border/20'
                )}
              >
                <CatIcon
                  className={cn(
                    'size-6 transition-colors',
                    isActive ? tc.text : 'text-foreground/80'
                  )}
                />
                <span
                  className={cn(
                    'text-[11px] font-bold uppercase tracking-widest leading-tight',
                    isActive ? tc.text : 'text-foreground/80'
                  )}
                >
                  {category.name}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-medium tabular-nums',
                    isActive ? tc.text : 'text-foreground/80'
                  )}
                >
                  {category.courses.length} ders
                </span>
              </button>
            );
          })}
        </div>

        {/* === DERS LİSTESİ === */}
        {activeCategory && (
          <div className="flex-1 min-h-0">
            {/* Kategori başlığı */}
            <div className="flex items-center gap-3 mb-5">
              {activeTheme && (
                <div
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center',
                    activeThemeConfig.bg
                  )}
                >
                  <activeTheme.Icon
                    className={cn('size-4', activeThemeConfig.text)}
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

            {/* Ders satırları */}
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
                      onNotes={(c) =>
                        navigate(`${ROUTES.NOTES}/${c.course_slug}`)
                      }
                      onQuiz={(c) =>
                        navigate(`${ROUTES.QUIZ}/${c.course_slug}`)
                      }
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
