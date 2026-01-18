"use client";

import {
  TvMinimalPlay,
  Clock,
  ChevronDown,
  TrendingUp,
  Scale,
  Calculator,
  Brain,
  type LucideIcon,
  BookOpen,
} from "lucide-react";
import { CourseList } from "@/components/home/CourseList";
import { formatDuration } from "@/lib/utils";
import { useEffect } from "react";
import { useCelebration } from "@/hooks/useCelebration";
import { useProgress } from "@/hooks/useProgress";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { type Course } from "@/lib/client-db";

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

const categoryStyles: Record<
  string,
  {
    Icon: LucideIcon;
    color: string;
    border: string;
    progress: string;
    bg: string;
  }
> = {
  EKONOMİ: {
    Icon: TrendingUp,
    color: "text-emerald-500",
    border: "border-emerald-500/20",
    progress: "bg-emerald-500",
    bg: "bg-emerald-500/10",
  },
  HUKUK: {
    Icon: Scale,
    color: "text-blue-500",
    border: "border-blue-500/20",
    progress: "bg-blue-500",
    bg: "bg-blue-500/10",
  },
  "MUHASEBE VE MALİYE": {
    Icon: Calculator,
    color: "text-purple-500",
    border: "border-purple-500/20",
    progress: "bg-purple-500",
    bg: "bg-purple-500/10",
  },
  "GENEL YETENEK VE İNGİLİZCE": {
    Icon: Brain,
    color: "text-orange-500",
    border: "border-orange-500/20",
    progress: "bg-orange-500",
    bg: "bg-orange-500/10",
  },
};

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
  const style = categoryStyles[name] || categoryStyles["EKONOMİ"];
  const { Icon } = style;
  const { stats } = useProgress();
  const { triggerCategoryCelebration, revokeCategoryCelebration } = useCelebration();

  const categoryName = name.split(" (")[0];
  const catStats = stats.categoryProgress[categoryName] || stats.categoryProgress[name];

  const displayCompletedVideos = catStats?.completedVideos ?? initialCompletedVideos;
  const displayTotalVideos = courses.reduce((acc, course) => acc + (course.total_videos || 0), 0);
  const displayCompletedHours = catStats?.completedHours ?? initialCompletedHours;
  const displayTotalHours = initialTotalHours || (catStats?.totalHours ?? 0);

  const progress = displayTotalHours > 0
    ? Math.round((displayCompletedHours / displayTotalHours) * 100)
    : 0;

  useEffect(() => {
    if (progress === 100 && displayTotalVideos > 0) {
      triggerCategoryCelebration();
    } else if (progress < 100) {
      revokeCategoryCelebration();
    }
  }, [progress, displayTotalVideos, triggerCategoryCelebration, revokeCategoryCelebration]);

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-200",
        style.border,
        style.bg,
        isOpen ? "shadow-2xl border-white/20 bg-zinc-900/90" : "hover:bg-zinc-900/40"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full p-6 lg:p-8 text-left relative z-10 focus:outline-hidden"
      >
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className={cn(
              "flex items-center justify-center h-12 w-12 rounded-xl bg-zinc-900 border border-white/5 shadow-md group-hover:scale-105 transition-transform",
              style.color
            )}>
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
              <span className="text-xl font-black text-white leading-none">%{progress}</span>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-1">İlerleme</p>
            </div>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              className="p-2 rounded-xl bg-white/5 border border-white/5 text-muted-foreground group-hover:text-white transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="mt-8 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn("h-full rounded-full", style.progress)}
          />
        </div>
      </button>

      {/* Course List Expansion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="border-t border-white/5 bg-black/10"
          >
            <div className="p-4 lg:p-5">
              <CourseList
                courses={[...courses].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))}
                categoryColor={style.color}
                categoryBgColor="bg-white/5"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
