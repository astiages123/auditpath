import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimelineEvent {
  type: 'work' | 'break' | 'pause';
  start: number;
  end?: number;
}

interface PomodoroSessionState {
  // Session state
  sessionId: string | null;
  sessionCount: number;
  originalStartTime: number | null;
  timeline: TimelineEvent[];
  hasRestored: boolean;

  // Actions
  setSessionId: (id: string | null) => void;
  setSessionCount: (count: number) => void;
  incrementSession: () => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  closeLastTimelineEvent: () => void;
  resetSession: () => void;
  setHasRestored: (val: boolean) => void;

  // Computed
  getPauseDuration: () => number;
}

export const usePomodoroSessionStore = create<PomodoroSessionState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      sessionCount: 1,
      originalStartTime: null,
      timeline: [],
      hasRestored: false,

      setSessionId: (id) => set({ sessionId: id }),

      setSessionCount: (count) => set({ sessionCount: count }),

      incrementSession: () =>
        set((state) => ({ sessionCount: state.sessionCount + 1 })),

      addTimelineEvent: (event) =>
        set((state) => ({
          timeline: [...state.timeline, event],
          originalStartTime: state.originalStartTime || event.start,
        })),

      closeLastTimelineEvent: () =>
        set((state) => {
          const now = Date.now();
          const newTimeline = [...state.timeline];
          const lastEvent = newTimeline[newTimeline.length - 1];

          if (lastEvent && !lastEvent.end) {
            lastEvent.end = now;
          }

          return { timeline: newTimeline };
        }),

      resetSession: () =>
        set(() => ({
          sessionId: null,
          sessionCount: 1,
          originalStartTime: null,
          timeline: [],
          hasRestored: true,
        })),

      setHasRestored: (val) => set({ hasRestored: val }),

      getPauseDuration: () => {
        const state = get();
        return state.timeline.reduce((acc, event) => {
          if (event.type === 'pause') {
            const end = event.end || Date.now();
            return acc + (end - event.start);
          }
          return acc;
        }, 0);
      },
    }),
    {
      name: 'pomodoro-session-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        sessionCount: state.sessionCount,
        originalStartTime: state.originalStartTime,
        timeline: state.timeline,
        hasRestored: state.hasRestored,
      }),
    }
  )
);
