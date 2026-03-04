import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { slugify } from '@/utils/stringHelpers';
import { CourseTopic } from '@/features/courses/types/courseTypes';
import { useNotesData } from './useNotesData';
import { useNotesPage } from './useNotesPage';
import { useNotesUI } from './useNotesUI';
import { useNotesSearch } from './useNotesSearch';
import { useNotesHighlight } from './useNotesHighlight';

export function useNotesPageLogic() {
  const { courseSlug, topicSlug } = useParams<{
    courseSlug: string;
    topicSlug?: string;
  }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { chunks, loading, error } = useNotesData({
    courseSlug: courseSlug || '',
    userId: user?.id,
  });

  const {
    activeChunkId,
    mainContentRef,
    handleGlobalClick,
    currentChunkToC,
    activeSection,
    setActiveSection,
    handleScrollToId,
  } = useNotesPage({
    courseSlug,
    topicSlug,
    chunks,
    loading,
  });

  const currentChunk = chunks.find(
    (c) => slugify(c.section_title) === activeChunkId
  );

  const {
    isLeftPanelVisible,
    setIsLeftPanelVisible,
    isRightPanelVisible,
    setIsRightPanelVisible,
    isQuizDrawerOpen,
    setIsQuizDrawerOpen,
    displayProgress,
    totalProgress,
    handleScroll,
  } = useNotesUI({ chunks, activeChunkId });

  const {
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    results,
    debouncedQuery,
    handleSearchResultClick,
    toggleSearch,
  } = useNotesSearch({
    content: currentChunk?.content || '',
    containerRef: mainContentRef,
  });

  const transformedContent = useNotesHighlight({
    currentChunk,
    debouncedQuery,
  });

  return {
    courseSlug,
    topicSlug,
    user,
    navigate,
    chunks,
    loading,
    error,
    activeChunkId,
    mainContentRef,
    handleGlobalClick,
    currentChunkToC,
    activeSection,
    setActiveSection,
    handleScrollToId,
    currentChunk,
    isLeftPanelVisible,
    setIsLeftPanelVisible,
    isRightPanelVisible,
    setIsRightPanelVisible,
    isQuizDrawerOpen,
    setIsQuizDrawerOpen,
    displayProgress,
    totalProgress,
    handleScroll,
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    results,
    debouncedQuery,
    handleSearchResultClick,
    toggleSearch,
    transformedContent,
    courseTitle: courseSlug || 'Ders Notları',
    topics: chunks,
    selectedTopic: currentChunk,
    content: transformedContent,
    isLeftPanelOpen: isLeftPanelVisible,
    setIsLeftPanelOpen: setIsLeftPanelVisible,
    isMobileMenuOpen: isLeftPanelVisible,
    setIsMobileMenuOpen: setIsLeftPanelVisible,
    activeTab: activeSection,
    setActiveTab: setActiveSection,
    handleTopicSelect: (topic: CourseTopic) => {
      handleScrollToId(slugify(topic.section_title), setActiveSection);
    },
  };
}
