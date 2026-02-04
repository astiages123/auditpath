import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TimerState {
    timeLeft: number;
    isActive: boolean;
    isBreak: boolean;
    duration: number;
    startTime: number | null;
    originalStartTime: number | null;
    endTime: number | null;
    sessionCount: number;
    selectedCourse: { id: string; name: string; category: string } | null;
    isWidgetOpen: boolean;
    sessionId: string | null;
    timeline: {
        type: "work" | "break" | "pause";
        start: number;
        end?: number;
    }[];
    courseName?: string;
    pauseStartTime: number | null;

    // Computed / Selectors
    getPauseDuration: () => number;

    startTimer: () => void;
    pauseTimer: () => void;
    resetTimer: (initialTime?: number) => void;
    resetAll: () => void;
    tick: () => void;
    setMode: (mode: "work" | "break") => void;
    setCourse: (
        course: { id: string; name: string; category: string } | null,
    ) => void;
    setWidgetOpen: (open: boolean) => void;
    incrementSession: () => void;
    setSessionId: (id: string | null) => void;
    setSessionCount: (count: number) => void;
    hasRestored: boolean;
    setHasRestored: (val: boolean) => void;
}

export const useTimerStore = create<TimerState>()(
    persist(
        (set, get) => ({
            timeLeft: 3000,
            isActive: false,
            isBreak: false,
            duration: 3000,
            startTime: null,
            originalStartTime: null,
            endTime: null,
            sessionCount: 1,
            selectedCourse: null,
            isWidgetOpen: false,
            sessionId: null,
            timeline: [],
            hasRestored: false,
            pauseStartTime: null,

            getPauseDuration: () => {
                const state = get();
                return state.timeline.reduce((acc, event) => {
                    if (event.type === "pause") {
                        const end = event.end || Date.now();
                        return acc + (end - event.start);
                    }
                    return acc;
                }, 0);
            },

            startTimer: () =>
                set((state) => {
                    const now = Date.now();
                    const newTimeline = [...state.timeline];

                    // Ensure all existing events are closed before adding a new one
                    newTimeline.forEach((event) => {
                        if (!event.end) {
                            event.end = now;
                        }
                    });

                    newTimeline.push({
                        type: state.isBreak ? "break" : "work",
                        start: now,
                    });

                    // Calculate end time based on remaining duration
                    // If resuming from pause, timeLeft is preserved
                    const endTime = now + (state.timeLeft * 1000);

                    return {
                        isActive: true,
                        startTime: now,
                        originalStartTime: state.originalStartTime || now,
                        endTime,
                        timeline: newTimeline,
                        pauseStartTime: null,
                    };
                }),

            pauseTimer: () =>
                set((state) => {
                    if (!state.isActive) return state;

                    const now = Date.now();
                    const newTimeline = [...state.timeline];
                    const lastEvent = newTimeline[newTimeline.length - 1];

                    if (lastEvent && !lastEvent.end) {
                        lastEvent.end = now;
                    }

                    newTimeline.push({
                        type: "pause",
                        start: now,
                    });

                    let newTimeLeft = state.timeLeft;
                    if (state.endTime) {
                        newTimeLeft = Math.ceil((state.endTime - now) / 1000);
                    }

                    return {
                        isActive: false,
                        endTime: null,
                        timeLeft: newTimeLeft,
                        timeline: newTimeline,
                        pauseStartTime: now,
                    };
                }),

            resetTimer: (initialTime) =>
                set((state) => ({
                    isActive: false,
                    timeLeft: initialTime !== undefined
                        ? initialTime
                        : state.duration,
                    startTime: null,
                    endTime: null,
                    pauseStartTime: null,
                    // originalStartTime, sessionId and timeline are preserved across basic resets to keep work+break cycle
                })),

            resetAll: () =>
                set(() => ({
                    timeLeft: 3000,
                    isActive: false,
                    isBreak: false,
                    duration: 3000,
                    startTime: null,
                    originalStartTime: null,
                    endTime: null,
                    sessionCount: 1,
                    selectedCourse: null,
                    isWidgetOpen: false,
                    sessionId: null,
                    timeline: [],
                    hasRestored: true,
                    pauseStartTime: null,
                })),

            tick: () =>
                set((state) => {
                    if (!state.isActive || !state.endTime) return state;
                    const now = Date.now();
                    const newTimeLeft = Math.ceil((state.endTime - now) / 1000);
                    return { timeLeft: newTimeLeft };
                }),

            setMode: (mode) => {
                const newDuration = mode === "work" ? 3000 : 600;
                set({
                    isBreak: mode === "break",
                    duration: newDuration,
                    timeLeft: newDuration,
                    isActive: false,
                    startTime: null,
                    originalStartTime: null,
                    endTime: null,
                    pauseStartTime: null,
                    // IMPORTANT: Do NOT reset sessionId or timeline here.
                    // They are reset in resetAll() or completion handlers.
                });
            },

            setCourse: (course) =>
                set((state) => ({
                    selectedCourse: course,
                    ...(state.selectedCourse?.id !== course?.id
                        ? {
                            sessionId: null,
                            timeline: [],
                            sessionCount: 1,
                            timeLeft: state.isBreak ? 600 : 3000, // Reset to standard durations if course changes
                            isActive: false,
                            startTime: null,
                            originalStartTime: null,
                            endTime: null,
                            pauseStartTime: null,
                        }
                        : {}),
                })),
            setWidgetOpen: (open) => set({ isWidgetOpen: open }),
            incrementSession: () =>
                set((state) => ({ sessionCount: state.sessionCount + 1 })),
            setSessionId: (id: string | null) => set({ sessionId: id }),
            setSessionCount: (count: number) => set({ sessionCount: count }),
            setHasRestored: (val: boolean) => set({ hasRestored: val }),
        }),
        {
            name: "pomodoro-storage",
            partialize: (state) => {
                const { ...rest } = state;
                return rest;
            },
        },
    ),
);
