import { create } from 'zustand';
import { LucideIcon } from 'lucide-react';

export type CelebrationVariant = 'course' | 'rank' | 'achievement' | 'group';

export interface CelebrationEvent {
  id: string;
  title: string;
  description: string;
  subtitle?: string;
  icon?: LucideIcon;
  imageUrl?: string;
  variant: CelebrationVariant;
  metadata?: Record<string, unknown>;
  onClose?: () => Promise<void> | void;
}

export interface CelebrationStore {
  celebrationQueue: CelebrationEvent[];
  currentCelebration: CelebrationEvent | null;
  isCelebrationOpen: boolean;
  enqueueCelebration: (event: CelebrationEvent) => void;
  nextCelebration: () => void;
  closeCelebration: () => void;
  clearCelebrations: () => void;
}

export const useCelebrationStore = create<CelebrationStore>()((set, get) => ({
  celebrationQueue: [],
  currentCelebration: null,
  isCelebrationOpen: false,

  enqueueCelebration: (event) => {
    const { currentCelebration, celebrationQueue } = get();
    if (
      currentCelebration?.id === event.id ||
      celebrationQueue.some((e) => e.id === event.id)
    ) {
      return;
    }
    set((state) => {
      if (!state.currentCelebration) {
        return {
          currentCelebration: event,
          isCelebrationOpen: true,
        };
      }
      return {
        celebrationQueue: [...state.celebrationQueue, event],
      };
    });
  },

  nextCelebration: () => {
    set((state) => {
      const nextEvent = state.celebrationQueue[0] || null;
      const remainingQueue = state.celebrationQueue.slice(1);
      if (nextEvent) {
        return {
          currentCelebration: nextEvent,
          celebrationQueue: remainingQueue,
          isCelebrationOpen: true,
        };
      } else {
        return {
          currentCelebration: null,
          isCelebrationOpen: false,
        };
      }
    });
  },

  closeCelebration: () => {
    get().nextCelebration();
  },

  clearCelebrations: () =>
    set({
      celebrationQueue: [],
      currentCelebration: null,
      isCelebrationOpen: false,
    }),
}));
