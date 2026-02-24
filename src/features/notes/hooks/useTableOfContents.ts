import {
  type MutableRefObject,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { generateTOCFromContent } from '../logic/notesLogic';

interface UseTableOfContentsProps {
  chunks: CourseTopic[];
  loading: boolean;
  activeChunkId: string;
  mainContentRef: RefObject<HTMLDivElement | null>;
  isProgrammaticScroll: MutableRefObject<boolean>;
}

export const useTableOfContents = ({
  chunks,
  loading,
  activeChunkId,
  mainContentRef,
  isProgrammaticScroll,
}: UseTableOfContentsProps) => {
  const [activeSection, setActiveSection] = useState<string>('');
  const lastActiveRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headingsRef = useRef<HTMLElement[]>([]);
  const rafRef = useRef<number | null>(null);

  const calculateActiveHeading = useCallback(() => {
    const container = containerRef.current;
    const headings = headingsRef.current;
    if (!container || headings.length === 0) return;

    const scrollTop = container.scrollTop;

    let activeHeadingId = '';

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const headingTop = heading.offsetTop;

      const threshold = scrollTop + 60;

      if (headingTop <= threshold) {
        activeHeadingId = heading.id;
      } else {
        break;
      }
    }

    if (activeHeadingId && activeHeadingId !== lastActiveRef.current) {
      lastActiveRef.current = activeHeadingId;
      setActiveSection(activeHeadingId);
    }
  }, []);

  useEffect(() => {
    if (loading || chunks.length === 0) return;

    containerRef.current = document.getElementById(
      'notes-scroll-container'
    ) as HTMLDivElement | null;

    if (!containerRef.current) return;

    const init = () => {
      headingsRef.current = Array.from(
        mainContentRef.current?.querySelectorAll('h1, h2, h3, h4, h5') || []
      ) as HTMLElement[];

      if (headingsRef.current.length > 0) {
        const firstHeading = headingsRef.current[0];
        if (firstHeading.id) {
          lastActiveRef.current = firstHeading.id;
          setActiveSection(firstHeading.id);
        }
      }

      calculateActiveHeading();
    };

    const timer = setTimeout(init, 150);

    const handleScroll = () => {
      if (isProgrammaticScroll.current) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(calculateActiveHeading);
    };

    containerRef.current.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      clearTimeout(timer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      containerRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, [
    chunks,
    loading,
    activeChunkId,
    mainContentRef,
    isProgrammaticScroll,
    calculateActiveHeading,
  ]);

  useEffect(() => {
    if (loading || chunks.length === 0) return;

    headingsRef.current = Array.from(
      mainContentRef.current?.querySelectorAll('h1, h2, h3, h4, h5') || []
    ) as HTMLElement[];
  }, [activeChunkId, loading, chunks.length, mainContentRef]);

  const forceActiveSection = useCallback((sectionId: string) => {
    lastActiveRef.current = sectionId;
    setActiveSection(sectionId);
  }, []);

  const toc = useMemo(() => {
    return generateTOCFromContent(chunks);
  }, [chunks]);

  const currentChunkToC = activeChunkId
    ? toc.filter((item) => item.chunkId === activeChunkId && item.level > 1)
    : [];

  return {
    toc,
    activeSection,
    setActiveSection: forceActiveSection,
    currentChunkToC,
  };
};
