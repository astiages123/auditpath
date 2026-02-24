import { useEffect, useRef } from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { useNotesStore } from '@/features/notes/store';

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

  const lastRead = useNotesStore((state) => state.lastRead);
  const setLastReadTopic = useNotesStore((state) => state.setLastReadTopic);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  const getScrollContainer = () =>
    document.getElementById('notes-scroll-container') || mainContentRef.current;

  // 2. Scroll to top when topic changes
  useEffect(() => {
    if (!isProgrammaticScroll.current) {
      getScrollContainer()?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeChunkId]);

  // 3. Save scroll position
  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer || !courseSlug || !activeChunkId) return;

    const saveScroll = () => {
      if (isProgrammaticScroll.current) return;

      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

      scrollTimeout.current = setTimeout(() => {
        setLastReadTopic(courseSlug, activeChunkId, scrollContainer.scrollTop);
      }, 500);
    };

    scrollContainer.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', saveScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [courseSlug, activeChunkId, setLastReadTopic]);

  // 4. Restore scroll position
  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!loading && chunks.length > 0 && courseSlug && scrollContainer) {
      const savedState = lastRead[courseSlug];

      if (savedState && savedState.topicId === activeChunkId) {
        const scrollValue = savedState.scrollPos;

        if (!isNaN(scrollValue) && scrollValue > 0) {
          requestAnimationFrame(() => {
            const container = getScrollContainer();
            if (container) {
              isProgrammaticScroll.current = true;
              container.scrollTo({
                top: scrollValue,
                behavior: 'instant' as ScrollBehavior,
              });

              setTimeout(() => {
                isProgrammaticScroll.current = false;
              }, 100);
            }
          });
        }
      }
    }
  }, [loading, chunks.length, courseSlug, activeChunkId, lastRead]);

  const handleScrollToId = (
    id: string,
    setActiveSection?: (id: string) => void
  ) => {
    const scrollContainer = getScrollContainer();
    isProgrammaticScroll.current = true;
    if (setActiveSection) setActiveSection(id);

    const element = document.getElementById(id);
    if (element && scrollContainer) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
