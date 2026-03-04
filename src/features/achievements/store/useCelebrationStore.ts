import { create } from 'zustand';
import type { LucideIcon } from 'lucide-react';

// ===========================
// === TYPES ===
// ===========================

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

// ===========================
// === STORE CREATION ===
// ===========================

/**
 * Zustand store for managing celebration events sequentially.
 */
export const useCelebrationStore = create<CelebrationStore>()((set, get) => ({
  celebrationQueue: [],
  currentCelebration: null,
  isCelebrationOpen: false,

  enqueueCelebration: (event) => {
    const { currentCelebration, celebrationQueue } = get();
    // Deduping: Avoid enqueuing an identical event
    if (
      currentCelebration?.id === event.id ||
      celebrationQueue.some((e) => e.id === event.id)
    ) {
      return;
    }

    set((state) => {
      // If none playing, immediately trigger it
      if (!state.currentCelebration) {
        return {
          currentCelebration: event,
          isCelebrationOpen: true,
        };
      }
      // Otherwise, add to the back of the queue
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
