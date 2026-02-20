import { type ReactNode } from 'react';
import { useQuizSessionState } from './useQuizSessionState';
import { QuizSessionContext } from './quizSessionContext';

interface QuizSessionProviderProps {
  children: ReactNode;
}

export function QuizSessionProvider({ children }: QuizSessionProviderProps) {
  const value = useQuizSessionState();

  return (
    <QuizSessionContext.Provider value={value}>
      {children}
    </QuizSessionContext.Provider>
  );
}
