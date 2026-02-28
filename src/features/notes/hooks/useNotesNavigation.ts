import { useEffect, useLayoutEffect, useRef } from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { useNotesStore } from '@/features/notes/store';

// --- Constants & Types ---
interface UseNotesNavigationProps {
  courseSlug?: string;
  loading: boolean;
  chunks: CourseTopic[];
  activeChunkId: string;
}

export const useNotesNavigation = ({
  courseSlug,
  loading,
  chunks,
  activeChunkId,
}: UseNotesNavigationProps) => {
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScroll = useRef<boolean>(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const saveScrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const lastRead = useNotesStore((state) => state.lastRead);
  const setLastReadTopic = useNotesStore((state) => state.setLastReadTopic);

  // Latest values ref to avoid re-triggering the effect on every save
  const latestParams = useRef({ lastRead, courseSlug, chunks });

  useLayoutEffect(() => {
    latestParams.current = { lastRead, courseSlug, chunks };
  }, [lastRead, courseSlug, chunks]);

  // Helper to get scroll container
  const getScrollContainer = () => {
    const main = document.querySelector('main');
    if (main) return main;
    return (
      document.getElementById('notes-scroll-container') ||
      mainContentRef.current
    );
  };

  // === SCROLL ORCHESTRATOR ===
  // Priority: Saved Position > Reset to Top
  useEffect(() => {
    const {
      chunks: currentChunks,
      courseSlug: currentSlug,
      lastRead: currentLastRead,
    } = latestParams.current;

    if (loading || currentChunks.length === 0 || !activeChunkId) return;

    let cancelled = false;

    const tryScroll = () => {
      if (cancelled) return;

      const scrollContainer = getScrollContainer();

      if (!scrollContainer) {
        scrollTimeout.current = setTimeout(tryScroll, 100);
        return;
      }

      isProgrammaticScroll.current = true;

      // PRIORITY 1: Restore saved position; PRIORITY 2: Reset to top
      const savedPos =
        currentSlug && currentLastRead[currentSlug]?.topicId === activeChunkId
          ? currentLastRead[currentSlug].scrollPos
          : 0;

      scrollContainer.scrollTo({
        top: !isNaN(savedPos) && savedPos > 0 ? savedPos : 0,
        behavior: 'instant',
      });

      // Release flag after transitions settle
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 1000);
    };

    scrollTimeout.current = setTimeout(tryScroll, 150);

    return () => {
      cancelled = true;
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
    // NOTE: lastRead, chunks, and courseSlug are accessed via latestParams ref to avoid re-triggering
  }, [loading, activeChunkId]);

  // 2. Save scroll position listener
  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer || !courseSlug || !activeChunkId) return;

    const saveScroll = () => {
      if (isProgrammaticScroll.current) return;

      if (saveScrollTimeout.current) clearTimeout(saveScrollTimeout.current);
      saveScrollTimeout.current = setTimeout(() => {
        setLastReadTopic(courseSlug, activeChunkId, scrollContainer.scrollTop);
      }, 500);
    };

    scrollContainer.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', saveScroll);
      if (saveScrollTimeout.current) clearTimeout(saveScrollTimeout.current);
    };
  }, [courseSlug, activeChunkId, setLastReadTopic]);

  const handleScrollToId = (
    id: string,
    setActiveSection?: (id: string) => void
  ) => {
    const scrollContainer = getScrollContainer();
    isProgrammaticScroll.current = true;
    if (setActiveSection) setActiveSection(id);

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

  const scrollToTop = () => {
    getScrollContainer()?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    mainContentRef,
    isProgrammaticScroll,
    handleScrollToId,
    scrollToTop,
  };
};
