import { useEffect, useRef, useState } from 'react';
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScroll = useRef<boolean>(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const lastRead = useNotesStore((state) => state.lastRead);
  const actions = useNotesStore((state) => state.actions);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  // 1. Scroll Progress
  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent) return;

    const handleScroll = () => {
      const scrollTop = mainContent.scrollTop;
      const scrollHeight = mainContent.scrollHeight;
      const clientHeight = mainContent.clientHeight;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);
    };

    mainContent.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, [chunks, loading]);

  // 2. Scroll to top when topic changes
  useEffect(() => {
    if (!isProgrammaticScroll.current) {
      mainContentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeChunkId]);

  // 3. Save scroll position
  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent || !courseSlug || !activeChunkId) return;

    const saveScroll = () => {
      if (isProgrammaticScroll.current) return;

      // Debounce saving to store
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

      scrollTimeout.current = setTimeout(() => {
        actions.setLastReadTopic(
          courseSlug,
          activeChunkId,
          mainContent.scrollTop
        );
      }, 500);
    };

    mainContent.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      mainContent.removeEventListener('scroll', saveScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [courseSlug, activeChunkId, actions]);

  // 4. Restore scroll position
  useEffect(() => {
    if (!loading && chunks.length > 0 && courseSlug && mainContentRef.current) {
      const savedState = lastRead[courseSlug];

      if (savedState && savedState.topicId === activeChunkId) {
        const scrollValue = savedState.scrollPos;

        if (!isNaN(scrollValue) && scrollValue > 0) {
          // Use a slight delay to ensure content is rendered
          // Using requestAnimationFrame for better timing
          requestAnimationFrame(() => {
            if (mainContentRef.current) {
              isProgrammaticScroll.current = true;
              mainContentRef.current.scrollTo({
                top: scrollValue,
                behavior: 'instant' as ScrollBehavior,
              });

              // Reset programmatic scroll flag after a short delay
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
    isProgrammaticScroll.current = true;
    if (setActiveSection) setActiveSection(id);

    const element = document.getElementById(id);
    if (element && mainContentRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 1000);
  };

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    mainContentRef,
    scrollProgress,
    isProgrammaticScroll,
    handleScrollToId,
    scrollToTop,
  };
};
