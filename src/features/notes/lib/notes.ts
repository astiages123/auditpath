// supabase import removed
import { logger } from '@/shared/lib/core/utils/logger';

export interface Note {
  courseId: string;
  content: string;
  updatedAt: Date;
}

// getNote expects the 'slug' (course.id) to be passed
export async function getNote(
  slug: string,
  signal?: AbortSignal
): Promise<Note | null> {
  try {
    // 1. Try to fetch from local files (Standardized path)
    const paths = [`/notes/${slug}/${slug}.md`, `/notes/${slug}/note.md`];

    for (const path of paths) {
      try {
        const res = await fetch(path, { signal });
        if (res.ok) {
          const content = await res.text();
          if (content && !content.startsWith('<!DOCTYPE html>')) {
            return {
              courseId: slug,
              content,
              updatedAt: new Date(),
            };
          }
        }
      } catch {
        // Continue
      }
    }

    return null;
  } catch (error) {
    logger.error('getNote error:', error as Error);
    return null;
  }
}
