import { type ReactNode } from 'react';
import { QuizSessionContext } from './QuizSessionContext';
import { useQuizSessionState } from './useQuizSessionState';

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
