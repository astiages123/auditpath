import {
  type MutableRefObject,
  type RefObject,
  useEffect,
  useMemo,
  useState,
} from "react";
import { slugify } from "@/utils/core";
import { type CourseTopic } from "@/types";
import { type LocalToCItem } from "./local-to-c.component";

export interface ExtendedToCItem extends LocalToCItem {
  chunkId: string;
}

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

  // 1. Active Section via IntersectionObserver
  useEffect(() => {
    if (loading || chunks.length === 0) return;

    const options = {
      root: mainContentRef.current,
      rootMargin: "-10% 0% -80% 0%",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      if (isProgrammaticScroll.current) return;

      const intersecting = entries.filter((entry) => entry.isIntersecting);
      if (intersecting.length > 0) {
        // Find the topmost intersecting element (smallest boundingClientRect.top)
        const topMost = intersecting.reduce((prev, curr) =>
          curr.boundingClientRect.top < prev.boundingClientRect.top
            ? curr
            : prev
        );

        if (topMost.target.id && topMost.target.id !== activeSection) {
          setActiveSection(topMost.target.id);
        }
      }
    }, options);

    // Observe all elements with an ID inside the scroll container
    const sections = mainContentRef.current?.querySelectorAll("[id]");
    sections?.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [
    chunks,
    loading,
    activeChunkId,
    activeSection,
    mainContentRef,
    isProgrammaticScroll,
  ]);

  // 2. Build Table of Contents (Computed via useMemo instead of useEffect+useState)
  const toc = useMemo(() => {
    if (chunks.length === 0) return [];

    const items: ExtendedToCItem[] = [];

    chunks.forEach((chunk) => {
      const chunkId = slugify(chunk.section_title);

      // Always add the chunk title itself as Level 1
      if (chunk.section_title) {
        items.push({
          id: chunkId,
          title: chunk.section_title,
          level: 1,
          chunkId: chunkId,
        });
      }

      const lines = chunk.content.split("\n");
      lines.forEach((line) => {
        const h1Match = line.match(/^#\s+(.+)$/);
        const h2Match = line.match(/^##\s+(.+)$/);
        const h3Match = line.match(/^###\s+(.+)$/);

        let level = 0;
        let title = "";

        if (h1Match) {
          title = h1Match[1].trim();
          level = 2;
        } else if (h2Match) {
          title = h2Match[1].trim();
          level = 3;
        } else if (h3Match) {
          title = h3Match[1].trim();
          level = 4;
        }

        if (level > 0) {
          items.push({
            id: slugify(title),
            title: title,
            level,
            chunkId: chunkId,
          });
        }
      });
    });

    // Dedupe
    return items.filter(
      (item, index, self) => index === self.findIndex((t) => t.id === item.id),
    );
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
