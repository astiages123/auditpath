import { usePomodoroSessionStore } from '@/features/pomodoro/store';

/**
 * Adapter for Pomodoro feature to be used by other features.
 * This decouples other features from Pomodoro's internal store structure.
 */
export const pomodoroAdapter = {
  /**
   * Associates a quiz session with the current active pomodoro session.
   *
   * @param quizSessionId - The ID of the quiz session to associate
   */
  associateQuizWithPomodoro: (quizSessionId: string) => {
    usePomodoroSessionStore
      .getState()
      .setAssociatedQuizSessionId(quizSessionId);
  },
};
