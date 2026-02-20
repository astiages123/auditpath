import { useContext } from 'react';
import { QuizSessionContext } from './quizSessionContext';

export function useQuizSession() {
  const context = useContext(QuizSessionContext);
  if (!context) {
    throw new Error('useQuizSession must be used within a QuizSessionProvider');
  }
  return context;
}
