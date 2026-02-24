import { FC } from 'react';
import {
  BookOpen,
  ArrowRight,
  Brain,
  LucideIcon,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import {
  type Course,
  type Category,
} from '@/features/courses/types/courseTypes';
import {
  ICON_OVERRIDES,
  COURSE_KEYWORD_MAPPINGS,
  CATEGORY_THEMES,
} from '@/features/courses/utils/coursesConfig';
import { type LandingCourseStats } from '@/features/quiz/services/quizLandingService';

interface QuizLandingViewProps {
  categories: Category[];
  dashboardStats: Record<string, LandingCourseStats>;
  onCourseSelect: (course: Course) => void;
  isLoading: boolean;
}

/**
 * Helper to get dynamic icon for a course based on its name or slug.
 */
const getCourseIcon = (course: Course): LucideIcon => {
  // 1. Check direct keyword overrides in slug
  const override = ICON_OVERRIDES.find((o) =>
    course.course_slug.toLowerCase().includes(o.keyword.toLowerCase())
  );
  if (override) return override.icon;

  // 2. Check keyword mappings
  const mapping = COURSE_KEYWORD_MAPPINGS.find((m) =>
    m.keywords.some((kw) =>
      course.name.toLowerCase().includes(kw.toLowerCase())
    )
  );
  if (mapping) return mapping.icon;

  return BookOpen; // Default
};

export const QuizLandingView: FC<QuizLandingViewProps> = ({
  categories,
  dashboardStats,
  onCourseSelect,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse font-medium">
          Sınav Merkezi hazırlanıyor...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Table of Contents / Sidebar */}
      {!isLoading && categories.length > 0 && (
        <aside className="hidden lg:flex w-72 flex-col border-r border-border/10 bg-card/20 py-10 px-6 overflow-hidden">
          <div className="flex flex-col space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Brain className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-widest">
                  Kategori Gezgini
                </h3>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider pl-7">
                Ders Grupları Arasında Hızlı Geçiş
              </p>
            </div>

            <nav className="space-y-1.5">
              {[...categories]
                .sort(
                  (a, b) =>
                    (a.sort_order || 0) - (b.sort_order || 0) ||
                    a.name.localeCompare(b.name)
                )
                .map((category, idx) => {
                  const categoryTheme =
                    CATEGORY_THEMES[category.name.toUpperCase()];
                  const CatIcon = categoryTheme?.Icon || Brain;

                  return (
                    <a
                      key={category.id}
                      href={`#category-${idx}`}
                      className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-primary/5 border border-transparent hover:border-primary/10 active:bg-primary/10"
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        <CatIcon className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                      <span className="text-sm font-black uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                        {category.name}
                      </span>
                    </a>
                  );
                })}
            </nav>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-6 lg:p-10 space-y-12 scroll-smooth">
        {/* Categorized Course Strips - Netflix Style */}
        {[...categories]
          .sort(
            (a, b) =>
              (a.sort_order || 0) - (b.sort_order || 0) ||
              a.name.localeCompare(b.name)
          )
          .map((category, catIdx) => (
            <section
              key={category.id}
              id={`category-${catIdx}`}
              className="space-y-6 pt-2 first:pt-0"
            >
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  {(() => {
                    const categoryTheme =
                      CATEGORY_THEMES[category.name.toUpperCase()];
                    const CatIcon = categoryTheme?.Icon || Brain;
                    return (
                      <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-primary/80">
                        <CatIcon className="w-5 h-5" />
                      </div>
                    );
                  })()}
                  <h2 className="text-2xl font-black tracking-tight uppercase text-foreground/90 font-sans">
                    {category.name}
                  </h2>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border">
                  {category.courses?.length || 0} Ders
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                {[...category.courses]
                  .sort(
                    (a, b) =>
                      (a.sort_order || 0) - (b.sort_order || 0) ||
                      a.name.localeCompare(b.name)
                  )
                  .map((course, _index) => {
                    const Icon = getCourseIcon(course);
                    const stats = dashboardStats[course.id];
                    const mastery = stats?.averageMastery || 0;
                    const lastStudy = stats?.lastStudyDate
                      ? new Date(stats.lastStudyDate).toLocaleDateString(
                          'tr-TR',
                          {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          }
                        )
                      : 'Hiç';

                    return (
                      <div
                        key={course.id}
                        onClick={() => onCourseSelect(course)}
                        className="group relative bg-card/40 backdrop-blur-sm border border-border/40 rounded-[2.5rem] overflow-hidden cursor-pointer shadow-sm hover:border-primary/30"
                      >
                        <div className="p-8 space-y-6">
                          <div className="flex items-start justify-between">
                            <div className="w-14 h-14 rounded-2xl bg-secondary/80 flex items-center justify-center text-foreground/70 shadow-inner">
                              <Icon className="w-7 h-7" />
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Aktif
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-xl font-black leading-tight group-hover:text-primary line-clamp-2 min-h-[3.5rem]">
                              {course.name}
                            </h3>
                          </div>

                          <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Brain className="w-3 h-3 text-primary/60" />
                                İlerleme
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

                        {/* Smart Footer */}
                        <div className="px-8 py-5 bg-secondary/30 border-t border-border/30 flex flex-col gap-3 group-hover:bg-primary/[0.03]">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-primary/40" />
                                <span>Son: {lastStudy}</span>
                              </div>
                              {stats?.difficultSubject && (
                                <div className="flex items-center gap-2 text-orange-500/80">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span className="truncate max-w-[120px]">
                                    {stats.difficultSubject}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-black text-primary uppercase tracking-wider">
                              Sınava Başla
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}

        {categories.length === 0 && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
            <BookOpen className="w-16 h-16 text-muted-foreground/20" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Ders Bulunamadı</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Henüz tanımlanmış bir eğitim kategorisi bulunmamaktadır.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
