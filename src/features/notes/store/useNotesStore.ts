import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LastReadEntry {
  topicId: string;
  scrollPos: number;
  timestamp: number;
}

interface NotesStore {
  lastRead: Record<string, LastReadEntry>;
  setLastReadTopic: (
    courseSlug: string,
    topicId: string,
    scrollPos: number
  ) => void;
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set) => ({
      lastRead: {},
      setLastReadTopic: (courseSlug, topicId, scrollPos) =>
        set((state) => ({
          lastRead: {
            ...state.lastRead,
            [courseSlug]: {
              topicId,
              scrollPos,
              timestamp: Date.now(),
            },
          },
        })),
    }),
    {
      name: 'notes-store',
      partialize: (state) => ({ lastRead: state.lastRead }),
    }
  )
);
