import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotesStore {
  lastRead: Record<
    string,
    { topicId: string; scrollPos: number; timestamp: number }
  >;

  actions: {
    setLastReadTopic: (
      courseSlug: string,
      topicId: string,
      scrollPos: number
    ) => void;
  };
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set) => ({
      lastRead: {},

      actions: {
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
      },
    }),
    {
      name: 'notes-store',
      partialize: (state) => ({ lastRead: state.lastRead }),
    }
  )
);
