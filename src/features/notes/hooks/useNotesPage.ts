import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { slugify } from '@/utils/stringHelpers';
import { useNotesNavigation } from './useNotesNavigation';
import { useTableOfContents } from './useTableOfContents';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { type LocalToCItem } from '../components/LocalToC';

interface UseNotesPageProps {
  courseSlug: string | undefined;
  topicSlug: string | undefined;
  chunks: CourseTopic[];
  loading: boolean;
  userId?: string;
}

interface UseNotesPageReturn {
  activeChunkId: string;
  activeChunk: CourseTopic | undefined;
  readingTimeMinutes: number | undefined;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  scrollProgress: number;
  handleScrollToId: (
    id: string,
    setActiveSection: (id: string) => void
  ) => void;
  scrollToTop: () => void;
  activeSection: string;
  setActiveSection: (id: string) => void;
  currentChunkToC: LocalToCItem[];
  handleGlobalClick: (chunkId: string) => void;
}

export function useNotesPage({
  courseSlug,
  topicSlug,
  chunks,
  loading,
}: UseNotesPageProps): UseNotesPageReturn {
  const navigate = useNavigate();

  const activeChunkId = useMemo(() => {
    if (topicSlug) return topicSlug;
    if (chunks.length > 0) return slugify(chunks[0].section_title);
    return '';
  }, [topicSlug, chunks]);

  const activeChunk = useMemo(
    () => chunks.find((c) => slugify(c.section_title) === activeChunkId),
    [chunks, activeChunkId]
  );

  const readingTimeMinutes = useMemo(() => {
    if (!activeChunk?.content) return undefined;
    return Math.max(
      1,
      Math.ceil(activeChunk.content.split(/\s+/).length / 200)
    );
  }, [activeChunk]);

  const {
    mainContentRef,
    scrollProgress,
    isProgrammaticScroll,
    handleScrollToId,
    scrollToTop,
  } = useNotesNavigation({
    courseSlug,
    loading,
    chunks,
    activeChunkId,
  });

  const { activeSection, setActiveSection, currentChunkToC } =
    useTableOfContents({
      chunks,
      loading,
      activeChunkId,
      mainContentRef,
      isProgrammaticScroll,
    });

  useEffect(() => {
    if (!loading && chunks.length > 0 && !topicSlug && courseSlug) {
      const firstChunkId = slugify(chunks[0].section_title);
      navigate(`${ROUTES.NOTES}/${courseSlug}/${firstChunkId}`, {
        replace: true,
      });
    }
  }, [loading, chunks, topicSlug, courseSlug, navigate]);

  const handleGlobalClick = (chunkId: string) => {
    if (courseSlug) {
      navigate(`${ROUTES.NOTES}/${courseSlug}/${chunkId}`);
    }
  };

  return {
    activeChunkId,
    activeChunk,
    readingTimeMinutes,
    mainContentRef,
    scrollProgress,
    handleScrollToId,
    scrollToTop,
    activeSection,
    setActiveSection,
    currentChunkToC,
    handleGlobalClick,
  };
}
