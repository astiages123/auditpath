import { useContext, type ReactNode } from 'react';
import { useQuizSessionState } from './useQuizSessionState';
import { QuizSessionContext } from './QuizSessionContext';

// ============================================================================
// Provider Component
// ============================================================================

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

// ============================================================================
// Consumer Hook
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export function useQuizSession() {
  const context = useContext(QuizSessionContext);
  if (!context) {
    throw new Error('useQuizSession must be used within a QuizSessionProvider');
  }
  return context;
}
