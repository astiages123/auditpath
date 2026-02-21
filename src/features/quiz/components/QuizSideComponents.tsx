import {
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle,
  Sparkles,
  ChevronRight,
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
  onStartMockQuiz?: () => void;
  isGeneratingExam: boolean;
}

export function TopicSidebar({
  loading,
  topics,
  selectedTopic,
  onSelectTopic,
  onStartSmartExam,
  onStartMockQuiz,
  isGeneratingExam,
}: TopicSidebarProps) {
  return (
    <div className="border-r border-border/30 overflow-y-auto p-3 flex flex-col gap-1">
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
          topics.map((topic, index) => (
            <button
              key={index}
              onClick={() => onSelectTopic(topic)}
              className={cn(
                'w-full text-left p-3 rounded-lg transition-all duration-150',
                selectedTopic?.name === topic.name
                  ? 'bg-primary-soft border border-primary-soft-border'
                  : 'hover:bg-muted/40 border border-transparent'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <FileText
                    className={cn(
                      'w-4 h-4 shrink-0',
                      selectedTopic?.name === topic.name
                        ? 'text-primary'
                        : 'text-muted-foreground/60'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm truncate',
                      selectedTopic?.name === topic.name
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    )}
                  >
                    {topic.name}
                  </span>
                </div>
                {topic.isCompleted && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {onStartMockQuiz && (
        <div className="mt-4 pt-4 border-t border-border/20">
          <Button
            variant="primary-soft"
            onClick={onStartMockQuiz}
            className="w-full flex items-center justify-between p-3 h-auto rounded-lg group"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary">
                Mock Soruları Yükle
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-primary/50 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      )}
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
          className="w-full text-left p-3 rounded-lg hover:bg-muted/40 border border-transparent"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <FileText className="w-4 h-4 text-muted-foreground/60" />
              <span className="text-sm truncate text-muted-foreground">
                {topic.name}
              </span>
            </div>
            {topic.isCompleted && (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
