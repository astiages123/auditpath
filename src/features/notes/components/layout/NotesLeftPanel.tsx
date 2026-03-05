import { cn } from '@/utils/stringHelpers';
import {
  SearchResultsSidebar,
  GlobalNavigation,
} from '@/features/notes/components';
import { CourseTopic } from '@/features/courses/types/courseTypes';
import { SearchResult } from '@/features/notes/types';

interface NotesLeftPanelProps {
  chunks: CourseTopic[];
  activeChunkId: string;
  isVisible: boolean;
  courseSlug: string;
  debouncedQuery?: string;
  results?: SearchResult[];
  onSearchResultClick?: (result: SearchResult) => void;
  onToggle: () => void;
}

export function NotesLeftPanel({
  chunks,
  activeChunkId,
  isVisible,
  courseSlug,
  debouncedQuery = '',
  results = [],
  onSearchResultClick,
  onToggle,
}: NotesLeftPanelProps) {
  const handleSearchResultClick = (result: SearchResult) => {
    if (onSearchResultClick) {
      onSearchResultClick(result);
    }
  };

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 border rounded-xl bg-card h-[400px] lg:h-full z-20 overflow-hidden transition-all duration-300 ease-in-out',
        !isVisible &&
          'lg:w-0 lg:opacity-0 lg:border-none lg:pointer-events-none'
      )}
    >
      <div className="min-w-[240px] h-full flex flex-col">
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
