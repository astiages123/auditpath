import { X } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { SearchResultsSidebar, GlobalNavigation } from './index';
import { CourseTopic } from '@/features/courses/types/courseTypes';
import { SearchResult } from '../types';

interface NotesLeftPanelProps {
  topics: CourseTopic[];
  selectedTopicId: string;
  isLeftPanelOpen: boolean;
  courseTitle: string;
  onTopicSelect: (topic: CourseTopic) => void;
  onSearchResultClick?: (result: SearchResult) => void;
  onTogglePanel: () => void;
  // Legacy or used by internal logic
  isVisible?: boolean;
  debouncedQuery?: string;
  results?: SearchResult[];
  chunks?: CourseTopic[];
  activeChunkId?: string;
  courseSlug?: string;
}

export function NotesLeftPanel({
  onTogglePanel,
  topics,
  selectedTopicId,
  isLeftPanelOpen,
  courseTitle,
  onSearchResultClick,
}: NotesLeftPanelProps) {
  const isVisible = isLeftPanelOpen;
  const chunks = topics;
  const activeChunkId = selectedTopicId;
  const courseSlug = courseTitle;
  const onToggle = onTogglePanel;
  const handleSearchResultClick = (result: SearchResult) => {
    if (onSearchResultClick) {
      onSearchResultClick(result);
    }
  };
  const debouncedQuery: string = '';
  const results: SearchResult[] = [];

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-80 border-r border-border/10 bg-background/50 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static lg:block',
        !isVisible && '-translate-x-full lg:hidden'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/10 px-6 py-4">
          <h2 className="text-xl font-bold tracking-tight">{courseTitle}</h2>
          <button
            onClick={onToggle}
            className="rounded-lg p-2 hover:bg-white/5 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {debouncedQuery && debouncedQuery.length >= 2 ? (
            <SearchResultsSidebar
              results={results}
              query={debouncedQuery}
              onResultClick={handleSearchResultClick}
            />
          ) : (
            <GlobalNavigation
              chunks={chunks}
              activeChunkId={activeChunkId}
              courseSlug={courseSlug || ''}
              onToggle={onToggle}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
