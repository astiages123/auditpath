import { Target } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';

interface MasteryItem {
  lessonId: string;
  title: string;
  mastery: number;
  videoProgress: number;
  questionProgress: number;
}

interface MasteryProgressNavigatorProps {
  sessions: MasteryItem[];
}

export const MasteryProgressNavigator = ({
  sessions,
}: MasteryProgressNavigatorProps) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        Kavram Ustalık Haritası
      </h4>
      <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold text-primary uppercase">
        {sessions.length} KAVRAM
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
      {sessions.map((lesson) => (
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
                    ? 'text-amber-400'
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
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
              )}
              style={{ width: `${lesson.mastery}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);
