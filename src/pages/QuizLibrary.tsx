import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  ArrowRight,
  Calendar,
  LucideIcon,
} from 'lucide-react';
import { getCategories } from '@/features/courses/services/courseService';
import type { Category, Course } from '@/features/courses/types/courseTypes';
import {
  ICON_OVERRIDES,
  COURSE_KEYWORD_MAPPINGS,
  CATEGORY_THEMES,
} from '@/features/courses/utils/coursesConfig';
import { ROUTES } from '@/utils/routes';
import { PageHeader } from '@/shared/components/PageHeader';
import { LibraryCardSkeleton } from '@/shared/components/SkeletonTemplates';
import {
  getLandingDashboardData,
  type LandingCourseStats,
} from '@/features/quiz/services/quizLandingService';
import { supabase } from '@/lib/supabase';

// === HELPERS ===

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

// === ANIMATIONS ===

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

// === COMPONENTS ===

function CourseCard({
  course,
  stats,
  onSelect,
  icon: Icon,
}: {
  course: Course;
  stats?: LandingCourseStats;
  onSelect: (c: Course) => void;
  icon: LucideIcon;
}) {
  const mastery = stats?.averageMastery || 0;
  const totalQuestions = stats?.totalQuestions || 0;
  const isActive = totalQuestions > 0;
  const lastStudy = stats?.lastStudyDate
    ? new Date(stats.lastStudyDate).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : 'Hiç';

  return (
    <motion.div
      variants={itemVariants}
      onClick={() => onSelect(course)}
      className="group relative bg-card/40 backdrop-blur-sm border border-border/40 rounded-[2.5rem] overflow-hidden cursor-pointer shadow-sm hover:border-primary/30 transition-all duration-300"
    >
      <div className="p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="w-14 h-14 rounded-2xl bg-secondary/80 flex items-center justify-center text-foreground/70 shadow-inner group-hover:scale-110 transition-transform duration-500">
            <Icon className="size-5" />
          </div>
          <div
            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
              isActive
                ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                : 'text-muted-foreground bg-secondary/50 border-border/40'
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
            />
            {isActive ? 'Aktif' : 'Pasif'}
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-black leading-tight group-hover:text-primary line-clamp-2 min-h-[3.5rem] transition-colors">
            {course.name}
          </h3>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Brain className="size-5 text-primary/60" />
              Ustalık Skoru
            </span>
            <span className="text-foreground text-sm tracking-tight">
              %{mastery}
            </span>
          </div>
          <div className="relative h-3 w-full bg-foreground/10 rounded-full overflow-hidden shadow-inner font-black">
            <div
              style={{ width: `${mastery}%` }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/80 to-primary rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="px-8 py-5 bg-secondary/30 border-t border-border/30 flex flex-col gap-3 group-hover:bg-primary/[0.03] transition-colors">
        <div className="flex items-center justify-between w-full font-sans">
          <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-primary/40" />
              <span>Son: {lastStudy}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-black text-primary uppercase tracking-wider">
            Sınava Başla
            <ArrowRight className="size-5 translate-x-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// === PAGE ===

export default function QuizLibrary() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dashboardStats, setDashboardStats] = useState<
    Record<string, LandingCourseStats>
  >({});
  const [loading, setLoading] = useState(true);
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

        // Sort logic from QuizLandingView
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
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-[60vh]">
        <div className="shrink-0">
          <PageHeader
            title="Sorular"
            subtitle="Bilgini test et ve eksiklerini gider."
          />
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <LibraryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="shrink-0">
        <PageHeader
          title="Sorular"
          subtitle="Bilgini test et ve eksiklerini gider."
        />
      </div>

      <div className="flex-1 flex min-h-0 gap-6">
        {/* Sticky Table of Contents (Left Sidebar) */}
        <aside className="hidden lg:flex w-72 flex-col border-r border-border/10 bg-card/20 rounded-xl py-10 px-6 overflow-hidden sticky top-0 h-screen">
          <div className="flex flex-col space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Brain className="size-5" />
                <h3 className="text-sm font-black uppercase tracking-widest text-primary">
                  Konu Başlıkları
                </h3>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider pl-7">
                Ders Grupları Arasında Hızlı Geçiş
              </p>
            </div>

            <nav className="space-y-1.5 scrollbar-hide overflow-y-auto">
              {categories.map((category, idx) => {
                const theme = CATEGORY_THEMES[category.name.toUpperCase()];
                const CatIcon = theme?.Icon || Brain;

                return (
                  <a
                    key={category.id}
                    href={`#category-${idx}`}
                    className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-primary/5 border border-transparent hover:border-primary/10 active:bg-primary/10 transition-all"
                  >
                    <CatIcon
                      className="size-5 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors"
                      style={{ width: '20px', height: '20px' }}
                    />
                    <span className="text-sm font-black uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                      {category.name}
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 p-6 lg:p-10 space-y-12 scroll-smooth bg-card/20 rounded-xl">
          {categories.map((category, catIdx) => {
            const sortedCourses = [...(category.courses || [])].sort(
              (a, b) =>
                (a.sort_order || 0) - (b.sort_order || 0) ||
                a.name.localeCompare(b.name)
            );

            if (sortedCourses.length === 0) return null;

            const theme = CATEGORY_THEMES[category.name.toUpperCase()];
            const CatIcon = theme?.Icon || Brain;

            return (
              <section
                key={category.id}
                id={`category-${catIdx}`}
                className="space-y-8 pt-4"
              >
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center text-primary/80">
                      <CatIcon className="size-5" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight uppercase text-foreground/90 font-sans">
                      {category.name}
                    </h2>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-secondary/50 px-4 py-1.5 rounded-full border">
                    {sortedCourses.length} Ders
                  </div>
                </div>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6"
                >
                  {sortedCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      stats={dashboardStats[course.id]}
                      icon={getCourseIcon(course)}
                      onSelect={(c) =>
                        navigate(`${ROUTES.QUIZ}/${c.course_slug}`)
                      }
                    />
                  ))}
                </motion.div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
