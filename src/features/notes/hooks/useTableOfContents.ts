import {
  type MutableRefObject,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type CourseTopic } from "@/features/courses/types/courseTypes";
import { generateTOCFromContent } from "../logic/notesLogic";

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
  const [activeSection, setActiveSection] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // 1. Active Section via IntersectionObserver
  useEffect(() => {
    if (loading || chunks.length === 0) return;

    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const options = {
      root: mainContentRef.current,
      // Adjusted rootMargin to better detect headers at the top of the viewport
      // "0px 0px -40% 0px" means we only care about the top 60% of the viewport
      rootMargin: "0px 0px -40% 0px",
      threshold: [0, 1.0],
    };

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      if (isProgrammaticScroll.current) return;

      // Debounce updates to prevent flickering
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(() => {
        const intersecting = entries.filter((entry) => entry.isIntersecting);
        if (intersecting.length > 0) {
          // Find the topmost intersecting element
          // We prioritize elements closer to the top of the viewport
          const topMost = intersecting.reduce((prev, curr) =>
            curr.boundingClientRect.top < prev.boundingClientRect.top
              ? curr
              : prev
          );

          setActiveSection((prev) => {
            if (topMost.target.id && topMost.target.id !== prev) {
              return topMost.target.id;
            }
            return prev;
          });
        }
      }, 50); // Small delay to stabilize
    };

    observerRef.current = new IntersectionObserver(handleIntersect, options);

    // Observe all elements with an ID inside the scroll container
    // Using a timeout to ensure DOM is ready
    const timer = setTimeout(() => {
      const sections = mainContentRef.current?.querySelectorAll("[id]");
      sections?.forEach((section) => observerRef.current?.observe(section));
    }, 100);

    return () => {
      clearTimeout(timer);
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [
    chunks,
    loading,
    activeChunkId,
    // activeSection, // Removed to prevent re-creation of observer on state change
    mainContentRef,
    isProgrammaticScroll,
  ]);

  // 2. Build Table of Contents (Using extracted pure function)
  const toc = useMemo(() => {
    return generateTOCFromContent(chunks);
  }, [chunks]);

  // 3. Derived filtered ToC for Right Panel
  const currentChunkToC = useMemo(() => {
    if (!activeChunkId) return [];
    return toc.filter(
      (item) => item.chunkId === activeChunkId && item.level > 1,
    );
  }, [toc, activeChunkId]);

  return {
    toc,
    activeSection,
    setActiveSection,
    currentChunkToC,
  };
};
