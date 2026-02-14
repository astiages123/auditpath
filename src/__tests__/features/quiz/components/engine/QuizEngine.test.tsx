import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QuizEngine } from '@/features/quiz/components/engine/QuizEngine';
import { useQuizSession } from '@/features/quiz/components/contexts/QuizSessionContext';
import { useQuiz } from '@/features/quiz/hooks/use-quiz';
import {
  renderWithQuizProvider,
  mockRepository,
  mockEngine,
  mockToast,
  resetMocks,
} from '@/__tests__/utils/quiz-test-utils';
import type { ReactNode } from 'react';
import type { UseQuizReturn } from '@/features/quiz/hooks/use-quiz';
import type { QuizSessionContextValue } from '@/features/quiz/components/contexts/QuizSessionContext';

const mockQuestion = {
  id: 'q1',
  type: 'multiple_choice' as const,
  q: 'Test Question',
  o: ['A', 'B'],
  a: 0,
  exp: 'Explanation',
};

// Shared mock functions
const mockStartQuiz = vi.fn();
const mockSelectAnswer = vi.fn();
const mockNextQuestion = vi.fn();
const mockGenerateBatch = vi.fn();
const mockLoadQuestions = vi.fn();
const mockMarkAsBlank = vi.fn();

vi.mock('@/features/quiz/api/repository', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return utils.mockRepository;
});
vi.mock('@/features/quiz/core/engine', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return utils.mockEngine;
});
vi.mock('sonner', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return { toast: utils.mockToast };
});
vi.mock('@/shared/lib/core/utils/logger', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return { logger: utils.mockLogger };
});
vi.mock('@/features/auth', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return { useAuth: utils.mockUseAuth };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode }) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: { children?: ReactNode }) => (
      <button {...props}>{children}</button>
    ),
    span: ({ children, ...props }: { children?: ReactNode }) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock('remark-math', () => ({ default: {} }));
vi.mock('rehype-katex', () => ({ default: {} }));

// Mock components
// Mock components
vi.mock('@/features/quiz/components/ui/QuizCard', () => ({
  QuizCard: ({
    onSelectAnswer,
    onBlank,
  }: {
    onSelectAnswer: (index: number) => void;
    onBlank: () => void;
  }) => (
    <div data-testid="quiz-card">
      <button onClick={() => onSelectAnswer(0)}>Correct</button>
      <button onClick={() => onSelectAnswer(1)}>Paris</button>
      <button onClick={onBlank}>Boş Bırak</button>
    </div>
  ),
}));
vi.mock('@/features/quiz/components/ui/QuizTimer', () => ({
  QuizTimer: () => <div>Timer</div>,
}));
vi.mock('@/features/quiz/components/engine/IntermissionScreen', () => ({
  IntermissionScreen: ({ onContinue }: { onContinue: () => void }) => (
    <button onClick={onContinue}>Sıradaki Sete Geç</button>
  ),
}));

const mockPostTestDashboard = vi.fn(({ onClose }: { onClose: () => void }) => (
  <div data-testid="dashboard">
    Dashboard tamamlandı
    <button onClick={onClose}>Close Dashboard</button>
  </div>
));
vi.mock('@/features/quiz/components/engine/PostTestDashboard', () => ({
  PostTestDashboard: (props: { onClose: () => void }) =>
    mockPostTestDashboard(props),
}));

vi.mock('@/features/quiz/hooks/use-quiz', () => ({
  useQuiz: vi.fn(() => ({
    state: {
      currentQuestion: null,
      queue: [],
      isLoading: false,
      hasStarted: false,
    },
    results: { correct: 0, incorrect: 0, blank: 0, totalTimeMs: 0 },
    generateBatch: mockGenerateBatch,
    loadQuestions: mockLoadQuestions,
    selectAnswer: mockSelectAnswer,
    startQuiz: mockStartQuiz,
    markAsBlank: mockMarkAsBlank,
    nextQuestion: mockNextQuestion,
  })),
}));

const mockSessionState = {
  isInitialized: true,
  isLoading: false,
  error: null,
  batches: [],
  reviewQueue: [],
  currentBatchIndex: 0,
  totalBatches: 1,
  courseStats: { totalQuestionsSolved: 100, averageMastery: 0 },
};

const mockInitializeSession = vi.fn();
const mockRecordResponse = vi.fn();
const mockAdvanceBatch = vi.fn();

vi.mock('@/features/quiz/components/contexts/QuizSessionContext', () => ({
  useQuizSession: vi.fn(),
}));

vi.mock('@/features/quiz/components/contexts/QuizSessionProvider', () => ({
  QuizSessionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// Helper to create a complete mock state for useQuiz
const createMockUseQuizReturn = (
  overrides: Partial<UseQuizReturn> = {}
): UseQuizReturn => ({
  state: {
    currentQuestion: null,
    queue: [],
    totalToGenerate: 0,
    generatedCount: 0,
    isLoading: false,
    error: null,
    selectedAnswer: null,
    isAnswered: false,
    showExplanation: false,
    isCorrect: null,
    hasStarted: false,
    summary: null,
    lastSubmissionResult: null,
  },
  results: { correct: 0, incorrect: 0, blank: 0, totalTimeMs: 0 },
  generateBatch: mockGenerateBatch,
  loadQuestions: mockLoadQuestions,
  selectAnswer: mockSelectAnswer,
  startQuiz: mockStartQuiz,
  markAsBlank: mockMarkAsBlank,
  nextQuestion: mockNextQuestion,
  toggleExplanation: vi.fn(),
  reset: vi.fn(),
  retry: vi.fn(),
  ...overrides,
});

import type { QuizSessionState } from '@/features/quiz/components/contexts/QuizSessionContext';

// Helper to create a complete mock state for useQuizSession
const createMockUseQuizSessionReturn = (
  overrides: { state?: Partial<QuizSessionState> } & Partial<
    Omit<QuizSessionContextValue, 'state'>
  > = {}
): QuizSessionContextValue => {
  const defaultState = {
    isInitialized: true,
    isLoading: false,
    error: null,
    sessionInfo: null,
    quotaInfo: null,
    reviewQueue: [],
    batches: [],
    currentBatchIndex: 0,
    totalBatches: 0,
    currentReviewIndex: 0,
    isReviewPhase: false,
    courseStats: null,
  };

  const { state: overrideState, ...otherOverrides } = overrides;

  return {
    state: { ...defaultState, ...overrideState },
    initializeSession: mockInitializeSession,
    recordResponse: mockRecordResponse,
    getNextReviewItem: vi.fn(),
    markReviewComplete: vi.fn(),
    advanceBatch: mockAdvanceBatch,
    injectScaffolding: vi.fn(),
    ...otherOverrides,
  };
};

describe('QuizEngine', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
    mockToast.dismiss(); // Cleanup toasts

    // Default useQuiz mock
    // const { useQuiz } = require('@/features/quiz/hooks/use-quiz');
    vi.mocked(useQuiz).mockReturnValue(
      createMockUseQuizReturn({
        state: {
          currentQuestion: null,
          queue: [],
          isLoading: false,
          hasStarted: false,
          generatedCount: 0,
          totalToGenerate: 0,
          isAnswered: false,
          lastSubmissionResult: null,
          error: null,
          selectedAnswer: null,
          showExplanation: false,
          isCorrect: null,
          summary: null,
        },
        retry: vi.fn(),
      })
    );

    vi.mocked(useQuizSession).mockReturnValue(
      createMockUseQuizSessionReturn({
        state: { ...mockSessionState }, // Mocks are partial here which is tricky, let's fix mockSessionState below or just accept valid subset if it matches. Actually mockSessionState is missing props.
        initializeSession: mockInitializeSession,
        recordResponse: mockRecordResponse,
        advanceBatch: mockAdvanceBatch,
      })
    );
  });

  describe('Flows', () => {
    it('should load batch questions when session items exist', async () => {
      vi.mocked(useQuizSession).mockReturnValue(
        createMockUseQuizSessionReturn({
          state: {
            ...mockSessionState,
            batches: [[{ questionId: 'q1', status: 'pending' }]],
          },
          initializeSession: mockInitializeSession,
        })
      );
      mockEngine.processBatchForUI.mockResolvedValue(['q1']);
      mockRepository.fetchQuestionsByIds.mockResolvedValue([
        {
          id: 'q1',
          question_data: {
            type: 'multiple_choice',
            q: 'Test Question',
            a: 0,
            o: ['X'],
            exp: 'Exp',
          },
        },
      ]);

      renderWithQuizProvider(<QuizEngine chunkId="c1" courseId="co1" />);

      await waitFor(() => {
        expect(mockLoadQuestions).toHaveBeenCalled();
      });
    });

    it('should start quiz correctly', async () => {
      const { useQuiz } = await import('@/features/quiz/hooks/use-quiz');
      vi.mocked(useQuiz).mockReturnValue(
        createMockUseQuizReturn({
          state: {
            hasStarted: false,
            queue: [{ ...mockQuestion }],
            generatedCount: 1,
            currentQuestion: null,
            totalToGenerate: 0,
            isLoading: false,
            error: null,
            selectedAnswer: null,
            isAnswered: false,
            showExplanation: false,
            isCorrect: null,
            summary: null,
            lastSubmissionResult: null,
          },
          startQuiz: mockStartQuiz,
          generateBatch: mockGenerateBatch,
        })
      );

      renderWithQuizProvider(<QuizEngine chunkId="c1" courseId="co1" />);
      fireEvent.click(screen.getByText(/Antrenmanı Başlat/i));
      expect(mockStartQuiz).toHaveBeenCalled();
    });

    it('should handle answer selection and toast', async () => {
      const { useQuiz } = await import('@/features/quiz/hooks/use-quiz');
      vi.mocked(useQuiz).mockReturnValue(
        createMockUseQuizReturn({
          state: {
            hasStarted: true,
            currentQuestion: { ...mockQuestion, a: 0 },
            queue: [],
            generatedCount: 1,
            totalToGenerate: 0,
            isLoading: false,
            error: null,
            selectedAnswer: null,
            isAnswered: false,
            showExplanation: false,
            isCorrect: null,
            summary: null,
            lastSubmissionResult: null,
          },
          selectAnswer: mockSelectAnswer,
          generateBatch: mockGenerateBatch,
        })
      );

      renderWithQuizProvider(<QuizEngine chunkId="c1" courseId="co1" />);
      fireEvent.click(screen.getByText('Paris')); // Wrong answer
      expect(mockSelectAnswer).toHaveBeenCalledWith(1);
      await waitFor(() => expect(mockToast.info).toHaveBeenCalled());
    });

    it('should handle blank answer', async () => {
      const { useQuiz } = await import('@/features/quiz/hooks/use-quiz');
      vi.mocked(useQuiz).mockReturnValue(
        createMockUseQuizReturn({
          state: {
            hasStarted: true,
            currentQuestion: { ...mockQuestion },
            queue: [],
            generatedCount: 1,
            totalToGenerate: 0,
            isLoading: false,
            error: null,
            selectedAnswer: null,
            isAnswered: false,
            showExplanation: false,
            isCorrect: null,
            summary: null,
            lastSubmissionResult: null,
          },
          markAsBlank: mockMarkAsBlank,
          generateBatch: mockGenerateBatch,
        })
      );

      renderWithQuizProvider(<QuizEngine chunkId="c1" courseId="co1" />);
      fireEvent.click(screen.getByText(/Boş Bırak/i));
      expect(mockMarkAsBlank).toHaveBeenCalled();
    });

    it('should handle next question', async () => {
      const { useQuiz } = await import('@/features/quiz/hooks/use-quiz');
      vi.mocked(useQuiz).mockReturnValue(
        createMockUseQuizReturn({
          state: {
            hasStarted: true,
            currentQuestion: { ...mockQuestion },
            queue: [{ ...mockQuestion }],
            isAnswered: true,
            generatedCount: 2,
            isLoading: false,
            totalToGenerate: 0,
            error: null,
            selectedAnswer: null,
            showExplanation: false,
            isCorrect: null,
            summary: null,
            lastSubmissionResult: null,
          },
          nextQuestion: mockNextQuestion,
          generateBatch: mockGenerateBatch,
        })
      );

      renderWithQuizProvider(<QuizEngine chunkId="c1" courseId="co1" />);

      await act(async () => {
        const btn = await screen.findByText(/Sıradaki Soru/i);
        fireEvent.click(btn);
      });

      expect(mockNextQuestion).toHaveBeenCalled();
    });

    it('should handle intermission and batch advancement', async () => {
      const { useQuiz } = await import('@/features/quiz/hooks/use-quiz');
      vi.mocked(useQuizSession).mockReturnValue(
        createMockUseQuizSessionReturn({
          state: {
            ...mockSessionState,
            totalBatches: 2,
            currentBatchIndex: 0,
          },
          advanceBatch: mockAdvanceBatch,
          initializeSession: mockInitializeSession,
        })
      );
      vi.mocked(useQuiz).mockReturnValue(
        createMockUseQuizReturn({
          state: {
            hasStarted: true,
            currentQuestion: null,
            queue: [],
            generatedCount: 10,
            isLoading: false,
            totalToGenerate: 0,
            error: null,
            selectedAnswer: null,
            isAnswered: false,
            showExplanation: false,
            isCorrect: null,
            summary: null,
            lastSubmissionResult: null,
          },
          results: {
            correct: 5,
            incorrect: 5,
            blank: 0,
            totalTimeMs: 0,
          },
          generateBatch: mockGenerateBatch,
        })
      );

      renderWithQuizProvider(<QuizEngine chunkId="c1" courseId="co1" />);

      await act(async () => {
        const btn = await screen.findByText(/Sıradaki Sete Geç/i);
        fireEvent.click(btn);
      });

      expect(mockAdvanceBatch).toHaveBeenCalled();
    });

    it('should show dashboard and handle close', async () => {
      const mockOnClose = vi.fn();
      const { useQuiz } = await import('@/features/quiz/hooks/use-quiz');
      vi.mocked(useQuizSession).mockReturnValue(
        createMockUseQuizSessionReturn({
          state: {
            ...mockSessionState,
            totalBatches: 1,
            currentBatchIndex: 0,
          },
          initializeSession: mockInitializeSession,
        })
      );
      vi.mocked(useQuiz).mockReturnValue(
        createMockUseQuizReturn({
          state: {
            hasStarted: true,
            currentQuestion: null,
            queue: [],
            generatedCount: 10,
            isLoading: false,
            totalToGenerate: 0,
            error: null,
            selectedAnswer: null,
            isAnswered: false,
            showExplanation: false,
            isCorrect: null,
            summary: null,
            lastSubmissionResult: null,
          },
          results: { correct: 10, incorrect: 0, blank: 0, totalTimeMs: 1000 },
          generateBatch: mockGenerateBatch,
        })
      );

      renderWithQuizProvider(
        <QuizEngine chunkId="c1" courseId="co1" onClose={mockOnClose} />
      );
      await waitFor(() =>
        expect(screen.getByText(/tamamlandı/i)).toBeInTheDocument()
      );
      fireEvent.click(screen.getByText('Close Dashboard'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle session error and retry', async () => {
      const { useQuiz } = await import('@/features/quiz/hooks/use-quiz');
      vi.mocked(useQuiz).mockReturnValue(
        createMockUseQuizReturn({
          state: {
            hasStarted: false,
            isLoading: false,
            queue: [],
            currentQuestion: null,
            totalToGenerate: 0,
            generatedCount: 0,
            error: null,
            selectedAnswer: null,
            isAnswered: false,
            showExplanation: false,
            isCorrect: null,
            summary: null,
            lastSubmissionResult: null,
          },
          generateBatch: mockGenerateBatch,
        })
      );

      vi.mocked(useQuizSession).mockReturnValue(
        createMockUseQuizSessionReturn({
          state: {
            ...mockSessionState,
            isInitialized: false,
            error: 'Err',
          },
          initializeSession: mockInitializeSession,
        })
      );

      renderWithQuizProvider(<QuizEngine chunkId="c1" courseId="co1" />);
      const btn = await screen.findByText(/Tekrar Dene/i);
      fireEvent.click(btn);
      expect(mockInitializeSession).toHaveBeenCalledWith('co1');
    });
  });
});
