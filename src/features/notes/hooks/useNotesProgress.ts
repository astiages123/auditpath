import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchCourseProgress,
  upsertNotesProgress,
} from '../services/notesProgressService';

export function useNotesProgress(
  userId: string | undefined,
  courseId: string | undefined
) {
  const [readingProgress, setReadingProgress] = useState<
    Record<string, number>
  >({});
  const syncTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch initial progress on mount
  useEffect(() => {
    if (!userId || !courseId) return;

    fetchCourseProgress(userId, courseId).then((data) => {
      const progressMap: Record<string, number> = {};
      data.forEach((item) => {
        progressMap[item.chunk_id] = item.progress;
      });
      setReadingProgress(progressMap);
    });

    // Capture ref value at effect start for cleanup
    const currentTimeouts = syncTimeoutRef.current;

    // Cleanup timeouts on unmount
    return () => {
      Object.values(currentTimeouts).forEach(clearTimeout);
    };
  }, [userId, courseId]);

  const updateProgress = useCallback(
    (chunkId: string, progress: number) => {
      if (!userId) return;

      setReadingProgress((prev) => {
        // Only update if progress increased (or first time)
        if (prev[chunkId] >= progress) return prev;
        return { ...prev, [chunkId]: progress };
      });

      // Debounced sync to Supabase
      if (syncTimeoutRef.current[chunkId]) {
        clearTimeout(syncTimeoutRef.current[chunkId]);
      }

      syncTimeoutRef.current[chunkId] = setTimeout(() => {
        upsertNotesProgress(userId, chunkId, progress);
        delete syncTimeoutRef.current[chunkId];
      }, 2000);
    },
    [userId]
  );

  return { readingProgress, updateProgress };
}
