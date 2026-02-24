import {
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { TopicWithCounts } from '@/features/courses/types/courseTypes';
import { cn } from '@/utils/stringHelpers';
import { Button } from '@/components/ui/button';

// ============================================================================
// Topic Sidebar (formerly TopicSidebar.tsx)
// ============================================================================

interface TopicSidebarProps {
  loading: boolean;
  topics: TopicWithCounts[];
  selectedTopic: TopicWithCounts | null;
  onSelectTopic: (topic: TopicWithCounts) => void;
  onStartSmartExam: () => void;
  isGeneratingExam: boolean;
}

export function TopicSidebar({
  loading,
  topics,
  selectedTopic,
  onSelectTopic,
  onStartSmartExam,
  isGeneratingExam,
}: TopicSidebarProps) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1">
      <div className="mb-4">
        <Button
          variant="primary-soft"
          onClick={onStartSmartExam}
          disabled={isGeneratingExam}
          className="w-full relative group overflow-hidden p-4 text-left h-auto"
        >
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-inner">
              <Sparkles
                className={cn('w-5 h-5', isGeneratingExam && 'animate-pulse')}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-foreground">
                Deneme Sınavı
              </h4>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 whitespace-normal">
                Tüm konulardan karışık bir deneme sınav oluştur.
              </p>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
        </Button>
      </div>

      <div className="flex-1 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Yükleniyor...</span>
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-center p-4">
            <AlertCircle className="w-7 h-7 mb-2 opacity-40" />
            <p className="text-sm">Konu bulunamadı</p>
          </div>
        ) : (
          topics.map((topic, index) => {
            const isActive = selectedTopic?.name === topic.name;
            return (
              <button
                key={index}
                onClick={() => onSelectTopic(topic)}
                className={cn(
                  'group relative w-full text-left flex items-center gap-3 px-3 py-3 mx-1 rounded-xl transition-all duration-300',
                  isActive
                    ? 'bg-primary/10 border border-primary/20'
                    : 'border border-transparent hover:bg-white/5 hover:border-white/5'
                )}
              >
                {/* İkon badge */}
                <div
                  className={cn(
                    'shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground border border-primary/20 shadow-lg shadow-primary/20'
                      : 'bg-foreground/10 text-muted-foreground group-hover:bg-foreground/20 group-hover:text-foreground'
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col">
                  <span
                    className={cn(
                      'text-[13px] leading-snug transition-all',
                      isActive
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground group-hover:text-foreground font-normal'
                    )}
                  >
                    {topic.name}
                  </span>
                </div>

                {topic.isCompleted && (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Topic List (Standalone version if needed)
// ============================================================================

export function TopicList({
  topics,
  onSelectTopic,
}: {
  topics: TopicWithCounts[];
  onSelectTopic: (topic: TopicWithCounts) => void;
}) {
  return (
    <div className="space-y-1">
      {topics.map((topic, index) => (
        <button
          key={index}
          onClick={() => onSelectTopic(topic)}
          className="group relative w-full text-left flex items-center gap-3 px-3 py-3 mx-1 rounded-xl transition-all duration-300 border border-transparent hover:bg-white/5 hover:border-white/5"
        >
          <div className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center bg-foreground/10 text-muted-foreground group-hover:bg-foreground/20 group-hover:text-foreground">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[13px] leading-snug font-normal text-muted-foreground group-hover:text-foreground">
              {topic.name}
            </span>
          </div>
          {topic.isCompleted && (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}
