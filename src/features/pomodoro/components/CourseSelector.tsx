import { useState } from 'react';
import { Search, Play, Target, X } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  useCourses,
  type CourseWithCategory,
} from '@/features/courses/hooks/useCourses';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';

// ===========================
// === PROPS DEFINITION ===
// ===========================

export interface CourseSelectorProps {
  onClose: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
  onBackdropClick: (e: React.MouseEvent) => void;
}

// ===========================
// === COMPONENT DEFINITION ===
// ===========================

export function CourseSelector({
  onClose,
  modalRef,
  onBackdropClick,
}: CourseSelectorProps) {
  const { setCourse } = usePomodoro();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: courses = [] } = useCourses();

  const filteredCourses = !searchQuery
    ? courses
    : courses.filter(
        (course) =>
          course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleCourseSelect = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (course) {
      setCourse({
        id: course.id,
        name: course.name,
        category: course.category || '',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto z-50"
      onClick={onBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        ref={modalRef}
        className="w-full max-w-lg bg-[#1a1a1c] border border-white/10 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]"
      >
        <div className="p-5 sm:p-7 border-b border-white/5 bg-white/5 relative">
          <div className="absolute right-6 top-6 flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-5">
            <div className="size-10 sm:size-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-white/10">
              <Target size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Hedef Belirle
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                Bugünkü odağın ne olacak?
              </p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              ref={(el) => el?.focus()}
              className="w-full bg-white/5 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-bold transition-all"
              placeholder="Ders veya konu ara..."
              aria-label="Ders veya konu ara"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-5 custom-scrollbar space-y-4">
          {Object.keys(
            filteredCourses.reduce(
              (
                acc: Record<
                  string,
                  { courses: CourseWithCategory[]; order: number }
                >,
                course
              ) => {
                const cat = course.category || 'Diğer';
                if (!acc[cat])
                  acc[cat] = { courses: [], order: course.category_sort_order };
                acc[cat].courses.push(course);
                return acc;
              },
              {}
            )
          ).length > 0 ? (
            Object.entries(
              filteredCourses.reduce(
                (
                  acc: Record<
                    string,
                    { courses: CourseWithCategory[]; order: number }
                  >,
                  course
                ) => {
                  const cat = course.category || 'Diğer';
                  if (!acc[cat])
                    acc[cat] = {
                      courses: [],
                      order: course.category_sort_order,
                    };
                  acc[cat].courses.push(course);
                  return acc;
                },
                {}
              )
            )
              .sort((a, b) => a[1].order - b[1].order)
              .map(([category, data]) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-black text-primary uppercase tracking-wider px-3 py-2 rounded-2xl">
                    {category}
                  </h3>
                  <div className="space-y-1">
                    {data.courses
                      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                      .map((course) => (
                        <motion.button
                          key={course.id}
                          onClick={() => handleCourseSelect(course.id)}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors flex items-center justify-between group"
                        >
                          <span className="text-white/60 group-hover:text-white font-bold text-sm tracking-tight transition-colors">
                            {course.name}
                          </span>
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 text-primary">
                            <Play size={14} fill="currentColor" />
                          </div>
                        </motion.button>
                      ))}
                  </div>
                </div>
              ))
          ) : (
            <div className="py-12 text-center text-muted-foreground font-medium">
              Sonuç bulunamadı.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
