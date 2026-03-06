import { useState } from 'react';
import { type SearchResult } from '../types';
import { useSearch } from './useSearch';

export interface UseNotesSearchProps {
  content: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseNotesSearchReturn {
  isSearchOpen: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedQuery: string;
  toggleSearch: () => void;
  results: SearchResult[];
  handleSearchResultClick: (result: SearchResult) => void;
}

export function useNotesSearch({
  content,
  containerRef,
}: UseNotesSearchProps): UseNotesSearchReturn {
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { results, debouncedQuery } = useSearch({
    content,
    query: searchQuery,
  });

  const handleSearchResultClick = (result: SearchResult): void => {
    const element = document.getElementById(result.id);
    if (!element || !containerRef.current) return;

    const container = containerRef.current;
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const relativeTop = elementRect.top - containerRect.top;
    const scrollTarget =
      container.scrollTop +
      relativeTop -
      container.clientHeight / 2 +
      element.clientHeight / 2;

    container.scrollTo({
      top: scrollTarget,
      behavior: 'smooth',
    });
  };

  const toggleSearch = (): void => {
    if (isSearchOpen) {
      setSearchQuery('');
    }

    setIsSearchOpen(!isSearchOpen);
  };

  return {
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    toggleSearch,
    results,
    handleSearchResultClick,
  };
}
