import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimerState {
    timeLeft: number;
    isActive: boolean;
    isBreak: boolean;
    duration: number;
    startTime: number | null;
    originalStartTime: number | null;
    endTime: number | null;
    totalPaused: number;
    sessionCount: number;
    selectedCourse: { id: string, name: string, category: string } | null;
    isWidgetOpen: boolean;
    sessionId: string | null;
    timeline: { type: 'work' | 'break' | 'pause', start: number, end?: number }[];
    courseName?: string;

    startTimer: () => void;
    pauseTimer: () => void;
    resetTimer: (initialTime?: number) => void;
    tick: () => void;
    setMode: (mode: 'work' | 'break') => void;
    setCourse: (course: { id: string, name: string, category: string } | null) => void;
    setWidgetOpen: (open: boolean) => void;
    incrementSession: () => void;
    setSessionId: (id: string | null) => void;
    setSessionCount: (count: number) => void;
    hasRestored: boolean;
    setHasRestored: (val: boolean) => void;
}

export const useTimerStore = create<TimerState>()(
    persist(
        (set) => ({
            timeLeft: 50 * 60,
            isActive: false,
            isBreak: false,
            duration: 50 * 60,
            startTime: null,
            originalStartTime: null,
            endTime: null,
            totalPaused: 0,
            sessionCount: 1,
            selectedCourse: null,
            isWidgetOpen: false,
            sessionId: null,
            timeline: [],
            hasRestored: false,

            startTimer: () => set((state) => {
                const now = Date.now();
                const newTimeline = [...state.timeline];

                // If resuming from pause, close the pause gap? 
                // Actually standard Pomodoro: Work -> Pause -> Work.
                // If we were paused, close the pause.
                if (!state.isActive && state.startTime === null && state.timeLeft !== state.duration) {
                    // This is a resume
                    const lastEvent = newTimeline[newTimeline.length - 1];
                    if (lastEvent && lastEvent.type === 'pause' && !lastEvent.end) {
                        lastEvent.end = now;
                    }
                }

                // Add Work or Break event
                newTimeline.push({
                    type: state.isBreak ? 'break' : 'work',
                    start: now
                });

                // Calculate endTime based on current timeLeft or start fresh
                const endTime = now + (state.timeLeft * 1000);

                return {
                    isActive: true,
                    startTime: now,
                    // Only set originalStartTime if it's not already set (i.e., first start)
                    originalStartTime: state.originalStartTime || now,
                    endTime,
                    timeline: newTimeline
                };
            }),
            pauseTimer: () => set((state) => {
                const now = Date.now();
                const newTimeline = [...state.timeline];
                const lastEvent = newTimeline[newTimeline.length - 1];
                if (lastEvent && !lastEvent.end) {
                    lastEvent.end = now;
                }

                // Add pause event
                newTimeline.push({
                    type: 'pause',
                    start: now
                });

                // Recalculate timeLeft one last time to be precise before pausing
                let newTimeLeft = state.timeLeft;
                if (state.isActive && state.endTime) {
                    newTimeLeft = Math.ceil((state.endTime - now) / 1000);
                }

                return {
                    isActive: false,
                    endTime: null,
                    timeLeft: newTimeLeft,
                    timeline: newTimeline
                };
            }),

            resetTimer: (initialTime) => set((state) => ({
                isActive: false,
                timeLeft: initialTime !== undefined ? initialTime : state.duration,
                startTime: null,
                originalStartTime: null,
                endTime: null,
                totalPaused: 0,
                sessionId: null,
                timeline: []
            })),

            tick: () => set((state) => {
                if (!state.isActive || !state.endTime) return state;
                const now = Date.now();
                const newTimeLeft = Math.ceil((state.endTime - now) / 1000);
                return { timeLeft: newTimeLeft };
            }),

            setMode: (mode) => {
                const newDuration = mode === 'work' ? 50 * 60 : 10 * 60;
                set({
                    isBreak: mode === 'break',
                    duration: newDuration,
                    timeLeft: newDuration,
                    isActive: false,
                    startTime: null,
                    originalStartTime: null,
                    endTime: null,
                    totalPaused: 0,
                    sessionId: null,
                    timeline: []
                });
            },

            setCourse: (course) => set({ selectedCourse: course }),
            setWidgetOpen: (open) => set({ isWidgetOpen: open }),
            incrementSession: () => set((state) => ({ sessionCount: state.sessionCount + 1 })),
            setSessionId: (id: string | null) => set({ sessionId: id }),
            setSessionCount: (count: number) => set({ sessionCount: count }),
            setHasRestored: (val: boolean) => set({ hasRestored: val }),
        }),
        {
            name: 'pomodoro-storage',
            partialize: (state) => {
                const { hasRestored, ...rest } = state;
                return rest;
            },
        }
    )
);
