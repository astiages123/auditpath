import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Course {
  id: string;
  name: string;
  category: string;
}

export interface PomodoroUIState {
  selectedCourse: Course | null;
  isWidgetOpen: boolean;
  courseName?: string;

  /** Sets the currently selected course in the UI */
  setCourse: (course: Course | null) => void;
  /** Toggles the Pomodoro widget open status */
  setWidgetOpen: (open: boolean) => void;
  /** Resets UI specific states to defaults */
  resetUI: () => void;
}

export const usePomodoroUIStore = create<PomodoroUIState>()(
  persist(
    (set) => ({
      selectedCourse: null,
      isWidgetOpen: false,
      courseName: undefined,

      setCourse: (course) =>
        set((state) => ({
          selectedCourse: course,
          ...(state.selectedCourse?.id !== course?.id
            ? {
                courseName: course?.name,
              }
            : {}),
        })),

      setWidgetOpen: (open) => set({ isWidgetOpen: open }),

      resetUI: () =>
        set(() => ({
          selectedCourse: null,
          isWidgetOpen: false,
          courseName: undefined,
        })),
    }),
    {
      name: 'pomodoro-ui-storage',
      partialize: (state) => ({
        selectedCourse: state.selectedCourse,
        isWidgetOpen: state.isWidgetOpen,
        courseName: state.courseName,
      }),
    }
  )
);
