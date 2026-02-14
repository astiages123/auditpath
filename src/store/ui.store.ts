import { create } from "zustand";
import { LucideIcon } from "lucide-react";

// --- Types from use-celebration-store.ts ---

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
    onClose?: () => Promise<void> | void; // Callback when this celebration is dismissed/covered
}

// --- Combined State Interface ---

interface UIStore {
    // Reference Drawer State (from use-ui-store.ts)
    isReferenceDrawerOpen: boolean;
    referenceChunkId: string | null;
    referenceHighlightTerm: string | null;

    // Celebration State (from use-celebration-store.ts)
    celebrationQueue: CelebrationEvent[];
    currentCelebration: CelebrationEvent | null;
    isCelebrationOpen: boolean;

    // Actions
    actions: {
        // Reference Drawer Actions
        openReference: (chunkId: string, highlightTerm?: string) => void;
        closeReference: () => void;

        // Celebration Actions
        enqueueCelebration: (event: CelebrationEvent) => void;
        nextCelebration: () => void;
        closeCelebration: () => void;
        clearCelebrations: () => void;
    };
}

export const useUIStore = create<UIStore>((set, get) => ({
    // Initial Reference Drawer State
    isReferenceDrawerOpen: false,
    referenceChunkId: null,
    referenceHighlightTerm: null,

    // Initial Celebration State
    celebrationQueue: [],
    currentCelebration: null,
    isCelebrationOpen: false,

    actions: {
        // Reference Drawer Actions
        openReference: (chunkId, highlightTerm) =>
            set({
                isReferenceDrawerOpen: true,
                referenceChunkId: chunkId,
                referenceHighlightTerm: highlightTerm || null,
            }),
        closeReference: () =>
            set({
                isReferenceDrawerOpen: false,
                referenceChunkId: null,
                referenceHighlightTerm: null,
            }),

        // Celebration Actions
        enqueueCelebration: (event) => {
            const { currentCelebration, celebrationQueue } = get();

            // Prevent duplicates in queue or current
            if (
                currentCelebration?.id === event.id ||
                celebrationQueue.some((e) => e.id === event.id)
            ) {
                return;
            }

            set((state) => {
                // If nothing is showing, show this immediately
                if (!state.currentCelebration) {
                    return {
                        currentCelebration: event,
                        isCelebrationOpen: true,
                    };
                }
                // Otherwise add to queue
                return { celebrationQueue: [...state.celebrationQueue, event] };
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
            get().actions.nextCelebration();
        },

        clearCelebrations: () =>
            set({
                celebrationQueue: [],
                currentCelebration: null,
                isCelebrationOpen: false,
            }),
    },
}));
