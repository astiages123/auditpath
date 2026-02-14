import { render } from '@testing-library/react';
import { QuizSessionProvider } from '@/features/quiz/components/contexts/QuizSessionProvider';
import { BrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
// eslint-disable-next-line react-refresh/only-export-components
export * from './quiz-mocks';

// --- Rendering Helper ---

export const renderWithQuizProvider = (ui: ReactNode) => {
  return render(
    <BrowserRouter>
      <QuizSessionProvider>{ui}</QuizSessionProvider>
    </BrowserRouter>
  );
};
