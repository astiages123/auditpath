import { slugify } from '@/utils/core';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { type LocalToCItem } from '../components/LocalToC';

export interface ExtendedToCItem extends LocalToCItem {
  chunkId: string;
}

/**
 * Generates a Table of Contents from course chunks.
 * This is a pure function extracted for better performance and testability.
 */
export const generateTOCFromContent = (
  chunks: CourseTopic[]
): ExtendedToCItem[] => {
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

    const lines = chunk.content.split('\n');
    lines.forEach((line) => {
      const h1Match = line.match(/^#\s+(.+)$/);
      const h2Match = line.match(/^##\s+(.+)$/);
      const h3Match = line.match(/^###\s+(.+)$/);

      let level = 0;
      let title = '';

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
    (item, index, self) => index === self.findIndex((t) => t.id === item.id)
  );
};
