import { useState } from 'react';
import { SearchResult, useSearch } from './useSearch';

interface UseNotesSearchProps {
  content: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useNotesSearch({ content, containerRef }: UseNotesSearchProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { results, debouncedQuery } = useSearch({
    content,
    query: searchQuery,
  });

  const handleSearchResultClick = (result: SearchResult) => {
    const element = document.getElementById(result.id);
    if (element && containerRef.current) {
      const container = containerRef.current;
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Calculate scroll position to center the element in the container
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

      // Focus the element for accessibility or add a temporary highlight class if needed
    }
  };

  const toggleSearch = () => {
    if (isSearchOpen) {
      setSearchQuery('');
    }
    setIsSearchOpen(!isSearchOpen);
  };

  return {
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    results,
    debouncedQuery,
    handleSearchResultClick,
    toggleSearch,
  };
}
