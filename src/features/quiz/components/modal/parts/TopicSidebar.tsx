import React from 'react';
import {
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { TopicWithCounts } from '@/shared/types/efficiency';

interface TopicSidebarProps {
  loading: boolean;
  topics: TopicWithCounts[];
  selectedTopic: TopicWithCounts | null;
  onSelectTopic: (topic: TopicWithCounts) => void;
}

export function TopicSidebar({
  loading,
  topics,
  selectedTopic,
  onSelectTopic,
}: TopicSidebarProps) {
  return (
    <div className="border-r border-border/40 overflow-y-auto p-4 space-y-2">
      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Konular yükleniyor...
        </div>
      ) : topics.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-center p-4">
          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
          <p>Bu derse ait not bulunamadı.</p>
        </div>
      ) : (
        topics.map((topic, index) => (
          <button
            key={index}
            onClick={() => onSelectTopic(topic)}
            className={`w-full text-left p-4 rounded-xl transition-all border ${
              selectedTopic?.name === topic.name
                ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10 shadow-sm'
                : 'hover:bg-muted/50 border-transparent hover:border-border/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 pt-0.5 flex-1 min-w-0">
                <FileText
                  className={`w-4 h-4 shrink-0 mt-0.5 ${selectedTopic?.name === topic.name ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span
                  className={`font-medium text-[15px] leading-snug wrap-break-word ${selectedTopic?.name === topic.name ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {topic.name}
                </span>
              </div>
              {/* Status Icon */}
              <div className="flex items-center gap-2 shrink-0">
                {topic.isCompleted && (
                  <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full text-[11px] font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Tamamlandı</span>
                  </div>
                )}
                {selectedTopic?.name === topic.name && (
                  <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
