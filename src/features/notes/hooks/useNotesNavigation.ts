import { useEffect, useLayoutEffect, useRef } from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { useNotesStore } from '@/features/notes/store';

export interface UseNotesNavigationProps {
  courseSlug?: string;
  loading: boolean;
  chunks: CourseTopic[];
  activeChunkId: string;
}

export interface UseNotesNavigationReturn {
  mainContentRef: React.MutableRefObject<HTMLDivElement | null>;
  isProgrammaticScroll: React.MutableRefObject<boolean>;
  handleScrollToId: (
    id: string,
    setActiveSection?: (id: string) => void
  ) => void;
  scrollToTop: () => void;
}

interface LatestParams {
  lastRead: Record<
    string,
    { topicId: string; scrollPos: number; timestamp: number }
  >;
  courseSlug: string | undefined;
  chunks: CourseTopic[];
}

export const useNotesNavigation = ({
  courseSlug,
  loading: isLoading,
  chunks,
  activeChunkId,
}: UseNotesNavigationProps): UseNotesNavigationReturn => {
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScroll = useRef<boolean>(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const saveScrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const lastRead = useNotesStore((state) => state.lastRead);
  const setLastReadTopic = useNotesStore((state) => state.setLastReadTopic);
  const latestParams = useRef<LatestParams>({ lastRead, courseSlug, chunks });

  useLayoutEffect(() => {
    latestParams.current = { lastRead, courseSlug, chunks };
  }, [lastRead, courseSlug, chunks]);

  const getScrollContainer = (): Element | null => {
    return (
      document.getElementById('notes-scroll-container') ||
      mainContentRef.current
    );
  };

  useEffect(() => {
    const {
      chunks: currentChunks,
      courseSlug: currentSlug,
      lastRead: currentLastRead,
    } = latestParams.current;

    if (isLoading || currentChunks.length === 0 || !activeChunkId) return;

    let isCancelled = false;

    const attemptScroll = (): void => {
      if (isCancelled) return;

      const scrollContainer = getScrollContainer();
      if (!scrollContainer) {
        scrollTimeout.current = setTimeout(attemptScroll, 100);
        return;
      }

      isProgrammaticScroll.current = true;
      const savedPosition =
        currentSlug && currentLastRead[currentSlug]?.topicId === activeChunkId
          ? currentLastRead[currentSlug].scrollPos
          : 0;

      scrollContainer.scrollTo({
        top: !isNaN(savedPosition) && savedPosition > 0 ? savedPosition : 0,
        behavior: 'instant',
      });

      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 1000);
    };

    scrollTimeout.current = setTimeout(attemptScroll, 150);

    return () => {
      isCancelled = true;
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [isLoading, activeChunkId]);

  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer || !courseSlug || !activeChunkId) return;

    const saveScrollPosition = (): void => {
      if (isProgrammaticScroll.current) return;

      if (saveScrollTimeout.current) clearTimeout(saveScrollTimeout.current);
      saveScrollTimeout.current = setTimeout(() => {
        setLastReadTopic(courseSlug, activeChunkId, scrollContainer.scrollTop);
      }, 500);
    };

    scrollContainer.addEventListener('scroll', saveScrollPosition, {
      passive: true,
    });

    return () => {
      scrollContainer.removeEventListener('scroll', saveScrollPosition);
      if (saveScrollTimeout.current) clearTimeout(saveScrollTimeout.current);
    };
  }, [courseSlug, activeChunkId, setLastReadTopic]);

  const handleScrollToId = (
    id: string,
    setActiveSection?: (id: string) => void
  ): void => {
    const scrollContainer = getScrollContainer();
    isProgrammaticScroll.current = true;

    if (setActiveSection) {
      setActiveSection(id);
    }

    const element = document.getElementById(id);
    if (element && scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const relativeTop = elementRect.top - containerRect.top;
      const targetScrollTop = scrollContainer.scrollTop + relativeTop - 10;

      scrollContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      });
    }

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 1500);
  };

  const scrollToTop = (): void => {
    getScrollContainer()?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    mainContentRef,
    isProgrammaticScroll,
    handleScrollToId,
    scrollToTop,
  };
};
