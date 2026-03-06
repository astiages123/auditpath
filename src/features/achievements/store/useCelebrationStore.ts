import { create } from 'zustand';
import type { LucideIcon } from 'lucide-react';

/**
 * Defines the type of celebration being presented.
 */
export type CelebrationVariant = 'course' | 'rank' | 'achievement' | 'group';

/**
 * Represents a discrete celebration event to be displayed.
 */
export interface CelebrationEvent {
  id: string;
  title: string;
  description: string;
  subtitle?: string;
  icon?: LucideIcon;
  imageUrl?: string;
  variant: CelebrationVariant;
  metadata?: Record<string, unknown>;
  /** Optional callback to run upon closing this celebration */
  onClose?: () => Promise<void> | void;
}

/**
 * Manages the state and queue of celebration events.
 */
export interface CelebrationStore {
  celebrationQueue: CelebrationEvent[];
  currentCelebration: CelebrationEvent | null;
  isCelebrationOpen: boolean;
  enqueueCelebration: (event: CelebrationEvent) => void;
  nextCelebration: () => void;
  closeCelebration: () => void;
  clearCelebrations: () => void;
}

/**
 * Zustand store for managing celebration events sequentially.
 */
export const useCelebrationStore = create<CelebrationStore>()((set, get) => ({
  celebrationQueue: [],
  currentCelebration: null,
  isCelebrationOpen: false,

  enqueueCelebration: (event) => {
    const { currentCelebration, celebrationQueue } = get();
    if (
      currentCelebration?.id === event.id ||
      celebrationQueue.some((queuedEvent) => queuedEvent.id === event.id)
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
      }

      return {
        currentCelebration: null,
        isCelebrationOpen: false,
      };
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
