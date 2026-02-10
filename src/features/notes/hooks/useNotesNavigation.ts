import { useEffect, useRef, useState } from 'react';
import { type CourseTopic } from '@/shared/types/efficiency';

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
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeChunkId]);

  // 3. Save scroll position
  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent || !courseSlug) return;

    const saveScroll = () => {
      localStorage.setItem(
        `scroll_pos_${courseSlug}`,
        mainContent.scrollTop.toString()
      );
    };

    mainContent.addEventListener('scroll', saveScroll, { passive: true });
    return () => mainContent.removeEventListener('scroll', saveScroll);
  }, [courseSlug, loading]);

  // 4. Restore scroll position
  useEffect(() => {
    if (!loading && chunks.length > 0 && courseSlug && mainContentRef.current) {
      const savedScroll = localStorage.getItem(`scroll_pos_${courseSlug}`);
      if (savedScroll) {
        const timer = setTimeout(() => {
          mainContentRef.current?.scrollTo({
            top: parseInt(savedScroll),
            behavior: 'instant' as ScrollBehavior,
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, chunks.length, courseSlug]);

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
