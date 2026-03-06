import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import {
  type ExtendedToCItem,
  generateTOCFromContent,
} from '../logic/notesLogic';

export interface UseTableOfContentsProps {
  chunks: CourseTopic[];
  loading: boolean;
  activeChunkId: string;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  isProgrammaticScroll: React.MutableRefObject<boolean>;
}

export interface UseTableOfContentsReturn {
  toc: ExtendedToCItem[];
  activeSection: string;
  setActiveSection: (id: string) => void;
  currentChunkToC: ExtendedToCItem[];
}

export const useTableOfContents = ({
  chunks,
  loading: isLoading,
  activeChunkId,
  mainContentRef,
  isProgrammaticScroll,
}: UseTableOfContentsProps): UseTableOfContentsReturn => {
  const [activeSection, setActiveSection] = useState<string>('');
  const lastActiveRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headingsRef = useRef<HTMLElement[]>([]);
  const rafRef = useRef<number | null>(null);

  const calculateActiveHeading = useCallback((): void => {
    const container = containerRef.current;
    const headings = headingsRef.current;
    if (!container || headings.length === 0) return;

    const scrollTop = container.scrollTop;
    let activeHeadingId: string = headings[0].id;

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const headingTop = heading.offsetTop;

      if (scrollTop >= headingTop - 10) {
        activeHeadingId = heading.id;
        continue;
      }

      break;
    }

    if (activeHeadingId && activeHeadingId !== lastActiveRef.current) {
      lastActiveRef.current = activeHeadingId;
      setActiveSection(activeHeadingId);
    }
  }, []);

  useEffect(() => {
    if (isLoading || chunks.length === 0) return;

    containerRef.current = document.getElementById(
      'notes-scroll-container'
    ) as HTMLDivElement | null;
    if (!containerRef.current) return;

    const setupObservation = (): void => {
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

    const initializationTimer: NodeJS.Timeout = setTimeout(
      setupObservation,
      150
    );

    const handleScroll = (): void => {
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
      clearTimeout(initializationTimer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      containerRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, [
    chunks,
    isLoading,
    activeChunkId,
    mainContentRef,
    isProgrammaticScroll,
    calculateActiveHeading,
  ]);

  useEffect(() => {
    if (isLoading || chunks.length === 0) return;

    headingsRef.current = Array.from(
      mainContentRef.current?.querySelectorAll('h1, h2, h3, h4, h5') || []
    ) as HTMLElement[];
  }, [activeChunkId, isLoading, chunks.length, mainContentRef]);

  const forceActiveSection = useCallback((sectionId: string): void => {
    lastActiveRef.current = sectionId;
    setActiveSection(sectionId);
  }, []);

  const toc: ExtendedToCItem[] = useMemo(() => {
    return generateTOCFromContent(chunks);
  }, [chunks]);

  const currentChunkToC: ExtendedToCItem[] = useMemo(() => {
    return activeChunkId
      ? toc.filter(
          (item: ExtendedToCItem) =>
            item.chunkId === activeChunkId && item.level > 1
        )
      : [];
  }, [toc, activeChunkId]);

  return {
    toc,
    activeSection,
    setActiveSection: forceActiveSection,
    currentChunkToC,
  };
};
