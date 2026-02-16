import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LucideIcon } from "lucide-react";
import { DailyEfficiencySummary } from "@/types";

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

export interface UIStore {
    // Reference Drawer State
    isReferenceDrawerOpen: boolean;
    referenceChunkId: string | null;
    referenceHighlightTerm: string | null;

    // Celebration State
    celebrationQueue: CelebrationEvent[];
    currentCelebration: CelebrationEvent | null;
    isCelebrationOpen: boolean;

    // Quota State
    quota: {
        dailyLimit: number;
        remaining: number;
    };

    // Efficiency State
    efficiencySummary: DailyEfficiencySummary | null;

    // Notes State
    lastRead: Record<
        string,
        { topicId: string; scrollPos: number; timestamp: number }
    >;

    // Actions
    actions: {
        // ... existing actions ...
        openReference: (chunkId: string, highlightTerm?: string) => void;
        closeReference: () => void;
        enqueueCelebration: (event: CelebrationEvent) => void;
        nextCelebration: () => void;
        closeCelebration: () => void;
        clearCelebrations: () => void;
        setQuota: (remaining: number, limit?: number) => void;
        decrementQuota: () => void;

        // Efficiency Actions
        setEfficiencySummary: (summary: DailyEfficiencySummary) => void;

        // Notes Actions
        setLastReadTopic: (
            courseSlug: string,
            topicId: string,
            scrollPos: number,
        ) => void;
    };
}

export const useUIStore = create<UIStore>()(
    persist(
        (set, get) => ({
            // Initial Reference Drawer State
            isReferenceDrawerOpen: false,
            referenceChunkId: null,
            referenceHighlightTerm: null,

            // Initial Celebration State
            celebrationQueue: [],
            currentCelebration: null,
            isCelebrationOpen: false,

            // Initial Quota State
            quota: {
                dailyLimit: 50,
                remaining: 50,
            },

            // Initial Efficiency State
            efficiencySummary: null,

            // Initial Notes State
            lastRead: {},

            actions: {
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
                            celebrationQueue: [
                                ...state.celebrationQueue,
                                event,
                            ],
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
                    get().actions.nextCelebration();
                },

                clearCelebrations: () =>
                    set({
                        celebrationQueue: [],
                        currentCelebration: null,
                        isCelebrationOpen: false,
                    }),

                setQuota: (remaining, limit) =>
                    set((state) => ({
                        quota: {
                            ...state.quota,
                            remaining,
                            dailyLimit: limit ?? state.quota.dailyLimit,
                        },
                    })),
                decrementQuota: () =>
                    set((state) => ({
                        quota: {
                            ...state.quota,
                            remaining: Math.max(0, state.quota.remaining - 1),
                        },
                    })),

                setEfficiencySummary: (summary) =>
                    set({ efficiencySummary: summary }),

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
            name: "ui-store",
            partialize: (state) => ({
                quota: state.quota, // Persist quota
                lastRead: state.lastRead, // Persist last read position
                // Don't persist UI states like open drawers or celebrations usually
            }),
        },
    ),
);
