import { X } from 'lucide-react';
import { SearchResultsSidebar, GlobalNavigation } from './index';
import { CourseTopic } from '@/features/courses/types/courseTypes';
import { SearchResult } from '../types';

interface NotesMobileTopicsProps {
  topics: CourseTopic[];
  selectedTopicId: string;
  isMobileMenuOpen: boolean;
  onTopicSelect: (topic: CourseTopic) => void;
  onSearchResultClick?: (result: SearchResult) => void;
  onClose: () => void;
}

export function NotesMobileTopics({
  topics,
  selectedTopicId,
  isMobileMenuOpen,
  onSearchResultClick,
  onClose,
}: NotesMobileTopicsProps) {
  if (!isMobileMenuOpen) return null;
  const chunks = topics;
  const activeChunkId = selectedTopicId;
  const courseSlug = '';
  const debouncedQuery: string = '';
  const results: SearchResult[] = [];
  const handleSearchResultClick = (result: SearchResult) => {
    if (onSearchResultClick) {
      onSearchResultClick(result);
    }
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-background animate-in slide-in-from-left duration-200">
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/20">
        <span className="text-base font-bold">İçindekiler</span>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {debouncedQuery && debouncedQuery.length >= 2 ? (
          <SearchResultsSidebar
            results={results}
            query={debouncedQuery}
            onResultClick={(id) => {
              handleSearchResultClick(id);
              onClose();
            }}
          />
        ) : (
          <GlobalNavigation
            chunks={chunks}
            activeChunkId={activeChunkId}
            courseSlug={courseSlug || ''}
            onItemClick={onClose}
            onToggle={onClose}
          />
        )}
      </div>
    </div>
  );
}
