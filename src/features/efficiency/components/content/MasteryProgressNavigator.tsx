import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { CommonEmptyState } from '@/features/efficiency/components/shared/CardElements';

// ==========================================
// === TYPES / PROPS ===
// ==========================================

export interface MasteryItem {
  lessonId: string;
  title: string;
  type?: string;
  mastery: number;
  videoProgress: number;
  questionProgress: number;
}

export interface MasteryProgressNavigatorProps {
  sessions: MasteryItem[];
}

// ==========================================
// === COMPONENT ===
// ==========================================

export const MasteryProgressNavigator = ({
  sessions,
}: MasteryProgressNavigatorProps) => {
  // ==========================================
  // === DERIVED STATE ===
  // ==========================================
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.mastery - a.mastery);
  }, [sessions]);

  // ==========================================
  // === RENDER ===
  // ==========================================
  return (
    <div className="mt-4 p-4 border border-border/50 rounded-xl bg-white/5 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          MÜFREDAT USTALIK HARİTASI
        </h4>
        <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-bold text-accent uppercase">
          {sessions.length} DERS
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {sessions.length > 0 ? (
          sortedSessions.map((lesson) => (
            <div
              key={lesson.lessonId}
              className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all flex flex-col gap-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white/90 truncate mr-2">
                  {lesson.title}
                </span>
                <span
                  className={cn(
                    'text-sm font-black',
                    lesson.mastery >= 80
                      ? 'text-emerald-400'
                      : lesson.mastery >= 50
                        ? 'text-primary'
                        : 'text-rose-400'
                  )}
                >
                  %{lesson.mastery}
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-700',
                    lesson.mastery >= 80
                      ? 'bg-emerald-500'
                      : lesson.mastery >= 50
                        ? 'bg-primary'
                        : 'bg-rose-500'
                  )}
                  style={{ width: `${lesson.mastery}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold pt-1">
                <span className="text-emerald-400">
                  {lesson.type === 'reading' ? 'Metin' : 'Video'} %
                  {lesson.videoProgress}
                </span>
                <span className="text-primary font-bold">
                  Quiz %{lesson.questionProgress}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-1 md:col-span-2">
            <CommonEmptyState message="Henüz müfredat ilerlemesi bulunamadı." />
          </div>
        )}
      </div>
    </div>
  );
};
