import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimerState {
    timeLeft: number;
    isActive: boolean;
    isBreak: boolean;
    duration: number;
    startTime: number | null;
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
}

export const useTimerStore = create<TimerState>()(
    persist(
        (set) => ({
            timeLeft: 50 * 60,
            isActive: false,
            isBreak: false,
            duration: 50 * 60,
            startTime: null,
            totalPaused: 0,
            sessionCount: 1,
            selectedCourse: null,
            isWidgetOpen: false,
            sessionId: null,
            timeline: [],

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

                return {
                    isActive: true,
                    startTime: now,
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

                return {
                    isActive: false,
                    timeline: newTimeline
                };
            }),

            resetTimer: (initialTime) => set((state) => ({
                isActive: false,
                timeLeft: initialTime !== undefined ? initialTime : state.duration,
                startTime: null,
                totalPaused: 0,
                sessionId: null,
                timeline: []
            })),

            tick: () => set((state) => {
                if (!state.isActive) return state;
                return { timeLeft: state.timeLeft - 1 };
            }),

            setMode: (mode) => {
                const newDuration = mode === 'work' ? 50 * 60 : 10 * 60;
                set({
                    isBreak: mode === 'break',
                    duration: newDuration,
                    timeLeft: newDuration,
                    isActive: false,
                    startTime: null,
                    totalPaused: 0,
                    sessionId: null,
                    timeline: []
                });
            },

            setCourse: (course) => set({ selectedCourse: course }),
            setWidgetOpen: (open) => set({ isWidgetOpen: open }),
            incrementSession: () => set((state) => ({ sessionCount: state.sessionCount + 1 })),
            setSessionId: (id: string | null) => set({ sessionId: id }),
            setSessionCount: (count) => set({ sessionCount: count }),
        }),
        {
            name: 'pomodoro-storage',
        }
    )
);
