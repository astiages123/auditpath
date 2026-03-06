import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimelineEvent {
  type: 'work' | 'break' | 'pause';
  start: number;
  end?: number | null;
}

export interface PomodoroSessionState {
  sessionId: string | null;
  associatedQuizSessionId: string | null;
  sessionCount: number;
  originalStartTime: number | null;
  timeline: TimelineEvent[];
  hasRestored: boolean;

  /** Sets the current session ID */
  setSessionId: (id: string | null) => void;
  /** Sets the associated quiz session ID */
  setAssociatedQuizSessionId: (id: string | null) => void;
  /** Force sets the session count */
  setSessionCount: (count: number) => void;
  /** Increments the session cycle count by 1 */
  incrementSession: () => void;
  /** Appends a new event to the session timeline */
  addTimelineEvent: (event: TimelineEvent) => void;
  /** Closes out the last active event on the timeline with the current timestamp */
  closeLastTimelineEvent: () => void;
  /** Resets the entire session back to initial values */
  resetSession: () => void;
  /** Sets whether state restoration from storage has succeeded */
  setHasRestored: (hasRestored: boolean) => void;

  /** Calculates the total time spent paused in the current session */
  getPauseDuration: () => number;
}

export const usePomodoroSessionStore = create<PomodoroSessionState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      associatedQuizSessionId: null,
      sessionCount: 1,
      originalStartTime: null,
      timeline: [],
      hasRestored: false,

      setSessionId: (id) => set({ sessionId: id }),
      setAssociatedQuizSessionId: (id) => set({ associatedQuizSessionId: id }),

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
          associatedQuizSessionId: null,
          sessionCount: 1,
          originalStartTime: null,
          timeline: [],
          hasRestored: true,
        })),

      setHasRestored: (hasRestored) => set({ hasRestored }),

      getPauseDuration: () => {
        const state = get();
        return state.timeline.reduce((totalPauseDuration, event) => {
          if (event.type === 'pause') {
            const end = event.end || Date.now();
            return totalPauseDuration + (end - event.start);
          }
          return totalPauseDuration;
        }, 0);
      },
    }),
    {
      name: 'pomodoro-session-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        associatedQuizSessionId: state.associatedQuizSessionId,
        sessionCount: state.sessionCount,
        originalStartTime: state.originalStartTime,
        timeline: state.timeline,
        hasRestored: state.hasRestored,
      }),
    }
  )
);
