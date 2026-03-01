import { useState } from 'react';
import { Search, Play, Target, X } from 'lucide-react';
import { motion } from 'framer-motion';
import coursesData from '@/features/courses/services/courses.json';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';

interface CourseSelectorProps {
  onClose: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
  onBackdropClick: (e: React.MouseEvent) => void;
}

export function CourseSelector({
  onClose,
  modalRef,
  onBackdropClick,
}: CourseSelectorProps) {
  const { setCourse } = usePomodoro();
  const [searchQuery, setSearchQuery] = useState('');

  const courseOptions = (
    coursesData as {
      name: string;
      courses: { id: string; name: string }[];
    }[]
  ).flatMap((category) =>
    category.courses.map((course) => ({
      id: course.id,
      name: course.name,
      category: category.name,
    }))
  );

  const filteredCategories = !searchQuery
    ? (coursesData as {
        name: string;
        courses: { id: string; name: string }[];
      }[])
    : (
        coursesData as {
          name: string;
          courses: { id: string; name: string }[];
        }[]
      )
        .map((cat) => ({
          ...cat,
          courses: cat.courses.filter((c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((cat) => cat.courses.length > 0);

  const handleCourseSelect = (courseId: string) => {
    const course = courseOptions.find((c) => c.id === courseId);
    if (course) setCourse(course);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md pointer-events-auto z-50"
      onClick={onBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        ref={modalRef}
        className="w-full max-w-lg bg-[#1a1a1c] border border-white/10 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto"
      >
        <div className="p-7 border-b border-white/5 bg-white/5 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-7 p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-5">
            <div className="size-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-white/10">
              <Target size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
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
              className="w-full bg-white/5 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-bold transition-all"
              placeholder="Ders veya konu ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto px-4 pb-6 custom-scrollbar space-y-6">
          {filteredCategories.length > 0 ? (
            (
              filteredCategories as {
                name: string;
                courses: { id: string; name: string }[];
              }[]
            ).map((cat, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] px-3">
                  {cat.name.replace(/\(.*\)/, '')}
                </h3>
                <div className="space-y-1">
                  {cat.courses.map((course) => (
                    <motion.button
                      key={course.id}
                      onClick={() => handleCourseSelect(course.id)}
                      className="w-full text-left px-5 py-4 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors flex items-center justify-between group"
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
