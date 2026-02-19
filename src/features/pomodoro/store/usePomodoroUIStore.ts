import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Course {
  id: string;
  name: string;
  category: string;
}

interface PomodoroUIState {
  // UI state
  selectedCourse: Course | null;
  isWidgetOpen: boolean;
  courseName?: string;

  // Actions
  setCourse: (course: Course | null) => void;
  setWidgetOpen: (open: boolean) => void;
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
