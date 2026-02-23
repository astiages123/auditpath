import { useState } from 'react';
import { Search, Play, Target, X } from 'lucide-react';
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
      category: string;
      courses: { id: string; name: string }[];
    }[]
  ).flatMap((category) =>
    category.courses.map((course) => ({
      id: course.id,
      name: course.name,
      category: category.category,
    }))
  );

  const filteredCategories = !searchQuery
    ? (coursesData as {
        category: string;
        courses: { id: string; name: string }[];
      }[])
    : (
        coursesData as {
          category: string;
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
    <div
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm pointer-events-auto"
      onClick={onBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
      >
        <div className="p-5 border-b border-border bg-muted/20 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Target size={24} />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-foreground">
                Hedef Belirle
              </h2>
              <p className="text-sm text-muted-foreground">
                Bugünkü odağın ne olacak?
              </p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-card">
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              className="w-full bg-secondary/50 border border-transparent rounded-xl py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              placeholder="Ders veya konu ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[320px] overflow-y-auto px-4 pb-4 custom-scrollbar space-y-4 bg-card">
          {filteredCategories.length > 0 ? (
            (
              filteredCategories as {
                category: string;
                courses: { id: string; name: string }[];
              }[]
            ).map((cat, idx) => (
              <div key={idx}>
                <h3 className="text-xs font-bold text-primary/80 uppercase tracking-wider mb-2 px-2">
                  {cat.category.replace(/\(.*\)/, '')}
                </h3>
                <div className="space-y-1">
                  {cat.courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => handleCourseSelect(course.id)}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-secondary/80 active:bg-secondary transition-colors flex items-center justify-between group"
                    >
                      <span className="text-foreground/80 group-hover:text-foreground font-medium">
                        {course.name}
                      </span>
                      <Play
                        size={16}
                        className="text-primary opacity-0 group-hover:opacity-100"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              Sonuç bulunamadı.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
