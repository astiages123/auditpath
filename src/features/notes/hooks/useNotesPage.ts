import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { slugify } from '@/utils/stringHelpers';
import { useNotesNavigation } from './useNotesNavigation';
import { useTableOfContents } from './useTableOfContents';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { type ExtendedToCItem } from '../logic/notesLogic';

export interface UseNotesPageProps {
  courseSlug: string | undefined;
  topicSlug: string | undefined;
  chunks: CourseTopic[];
  loading: boolean;
  userId?: string;
}

export interface UseNotesPageReturn {
  activeChunkId: string;
  activeChunk: CourseTopic | undefined;
  readingTimeMinutes: number | undefined;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  handleScrollToId: (
    id: string,
    setActiveSection: (id: string) => void
  ) => void;
  scrollToTop: () => void;
  activeSection: string;
  setActiveSection: (id: string) => void;
  currentChunkToC: ExtendedToCItem[];
  handleGlobalClick: (chunkId: string) => void;
}

export function useNotesPage({
  courseSlug,
  topicSlug,
  chunks,
  loading: isLoading,
}: UseNotesPageProps): UseNotesPageReturn {
  const navigate = useNavigate();

  const activeChunkId: string = useMemo(() => {
    if (topicSlug) return topicSlug;
    return '';
  }, [topicSlug]);

  const activeChunk: CourseTopic | undefined = useMemo(() => {
    return activeChunkId
      ? chunks.find(
          (chunk: CourseTopic) => slugify(chunk.section_title) === activeChunkId
        )
      : undefined;
  }, [chunks, activeChunkId]);

  const readingTimeMinutes: number | undefined = useMemo(() => {
    if (!activeChunk?.content) return undefined;
    return Math.max(
      1,
      Math.ceil(activeChunk.content.split(/\s+/).length / 200)
    );
  }, [activeChunk]);

  const {
    mainContentRef,
    isProgrammaticScroll,
    handleScrollToId,
    scrollToTop,
  } = useNotesNavigation({
    courseSlug,
    loading: isLoading,
    chunks,
    activeChunkId,
  });

  const { activeSection, setActiveSection, currentChunkToC } =
    useTableOfContents({
      chunks,
      loading: isLoading,
      activeChunkId,
      mainContentRef,
      isProgrammaticScroll,
    });

  const handleGlobalClick = (chunkId: string): void => {
    if (!courseSlug) return;
    navigate(`${ROUTES.NOTES}/${courseSlug}/${chunkId}`);
  };

  return {
    activeChunkId,
    activeChunk,
    readingTimeMinutes,
    mainContentRef,
    handleScrollToId,
    scrollToTop,
    activeSection,
    setActiveSection,
    currentChunkToC,
    handleGlobalClick,
  };
}
