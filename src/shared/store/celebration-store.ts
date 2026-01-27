import { create } from "zustand";
import { LucideIcon } from "lucide-react";

export type CelebrationVariant = "course" | "rank" | "achievement" | "group";

export interface CelebrationEvent {
  id: string; // Unique ID (e.g., "COURSE:123", "RANK:5")
  title: string;
  description: string;
  subtitle?: string; // Motto or extra text
  icon?: LucideIcon;
  imageUrl?: string;
  variant: CelebrationVariant;
  metadata?: Record<string, unknown>; // Extra data if needed
}

interface CelebrationStore {
  queue: CelebrationEvent[];
  current: CelebrationEvent | null;
  isOpen: boolean;

  // Actions
  enqueue: (event: CelebrationEvent) => void;
  next: () => void;
  close: () => void;
  clear: () => void;
}

export const useCelebrationStore = create<CelebrationStore>((set, get) => ({
  queue: [],
  current: null,
  isOpen: false,

  enqueue: (event) => {
    const { current, queue } = get();
    
    // Prevent duplicates in queue or current
    if (current?.id === event.id || queue.some((e) => e.id === event.id)) {
      return;
    }

    set((state) => {
      // If nothing is showing, show this immediately
      if (!state.current) {
        return { current: event, isOpen: true };
      }
      // Otherwise add to queue
      return { queue: [...state.queue, event] };
    });
  },

  next: () => {
    set((state) => {
      const nextEvent = state.queue[0] || null;
      const remainingQueue = state.queue.slice(1);

      if (nextEvent) {
        return {
            current: nextEvent,
            queue: remainingQueue,
            isOpen: true
        };
      } else {
        return {
            current: null,
            isOpen: false
        };
      }
    });
  },

  close: () => {
    // When closing, we trigger next() after a short delay or immediately
    // Typically close() just shuts the modal. The Modal onUnmount or animation usage
    // should trigger next(). 
    // BUT for simplicity, let's say 'close' means "I'm done with this one, show me the next".
    get().next();
  },

  clear: () => set({ queue: [], current: null, isOpen: false }),
}));
