import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizCard } from '@/features/quiz/components/ui/QuizCard';
import type { QuizQuestion } from '@/shared/types/quiz';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createMockQuestion = (
  overrides: Partial<QuizQuestion> = {}
): QuizQuestion => ({
  type: 'multiple_choice',
  q: 'What is the capital of France?',
  o: ['London', 'Paris', 'Berlin', 'Madrid', 'Rome'],
  a: 1,
  exp: 'Paris is the capital of France.',
  img: undefined,
  imageUrls: [],
  ...overrides,
});

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('QuizCard', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultProps: any = {
    question: null as QuizQuestion | null,
    selectedAnswer: null as number | null,
    isAnswered: false,
    isCorrect: null as boolean | null,
    showExplanation: false,
    isLoading: false,
    error: null as string | null,
    onSelectAnswer: vi.fn(),
    onToggleExplanation: vi.fn(),
    onRetry: vi.fn(),
  };

  let mockOnSelectAnswer: ReturnType<typeof vi.fn>;
  let mockOnToggleExplanation: ReturnType<typeof vi.fn>;
  let mockOnRetry: ReturnType<typeof vi.fn>;
  let mockOnBlank: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSelectAnswer = vi.fn();
    mockOnToggleExplanation = vi.fn();
    mockOnRetry = vi.fn();
    mockOnBlank = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Loading State', () => {
    it('should render loading state correctly', () => {
      renderWithRouter(<QuizCard {...defaultProps} isLoading={true} />);
      expect(screen.getByText(/soru hazırlanıyor/i)).toBeInTheDocument();
    });

    it('should show AI generation message during loading', () => {
      renderWithRouter(<QuizCard {...defaultProps} isLoading={true} />);
      expect(
        screen.getByText(/mimo v2 flash ai ile soru üretiliyor/i)
      ).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render error state with error message', () => {
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          error="Failed to load question"
          onRetry={mockOnRetry}
        />
      );
      expect(screen.getByText(/failed to load question/i)).toBeInTheDocument();
    });

    it('should render retry button in error state', () => {
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          error="Failed to load question"
          onRetry={mockOnRetry}
        />
      );
      expect(
        screen.getByRole('button', { name: /tekrar dene/i })
      ).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          error="Failed to load question"
          onRetry={mockOnRetry}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /tekrar dene/i }));
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no question', () => {
      renderWithRouter(<QuizCard {...defaultProps} question={null} />);
      expect(screen.getByText(/soru bekleniyor/i)).toBeInTheDocument();
    });
  });

  describe('Question Display', () => {
    it('should render question text', () => {
      const question = createMockQuestion();
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          question={question}
          onSelectAnswer={mockOnSelectAnswer}
        />
      );
      expect(
        screen.getByText(/what is the capital of france/i)
      ).toBeInTheDocument();
    });

    it('should render all options', () => {
      const question = createMockQuestion();
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          question={question}
          onSelectAnswer={mockOnSelectAnswer}
        />
      );
      expect(screen.getByText(/london/i)).toBeInTheDocument();
      expect(screen.getByText(/paris/i)).toBeInTheDocument();
      expect(screen.getByText(/berlin/i)).toBeInTheDocument();
      expect(screen.getByText(/madrid/i)).toBeInTheDocument();
      expect(screen.getByText(/rome/i)).toBeInTheDocument();
    });

    it('should render insight when provided', () => {
      const question = createMockQuestion({ insight: 'Test insight' });
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          question={question}
          onSelectAnswer={mockOnSelectAnswer}
        />
      );
      expect(screen.getByText(/mentorun notu/i)).toBeInTheDocument();
    });
  });

  describe('Option Selection', () => {
    it('should call onSelectAnswer when option is clicked', () => {
      const question = createMockQuestion();
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          question={question}
          onSelectAnswer={mockOnSelectAnswer}
        />
      );
      fireEvent.click(screen.getByText(/paris/i));
      expect(mockOnSelectAnswer).toHaveBeenCalledWith(1);
    });

    it('should disable options after answered', () => {
      const question = createMockQuestion();
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          question={question}
          selectedAnswer={1}
          isAnswered={true}
          onSelectAnswer={mockOnSelectAnswer}
        />
      );
      const option = screen.getByText(/london/i).closest('button');
      expect(option).toBeDisabled();
    });
  });

  describe('Explanation Panel', () => {
    it('should show explanation panel after answered', () => {
      const question = createMockQuestion();
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          question={question}
          isAnswered={true}
          showExplanation={false}
          onToggleExplanation={mockOnToggleExplanation}
        />
      );
      expect(screen.getByText(/hoca notu/i)).toBeInTheDocument();
    });

    it('should toggle explanation on click', () => {
      const question = createMockQuestion();
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          question={question}
          isAnswered={true}
          showExplanation={false}
          onToggleExplanation={mockOnToggleExplanation}
        />
      );
      fireEvent.click(screen.getByText(/hoca notu/i));
      expect(mockOnToggleExplanation).toHaveBeenCalled();
    });

    it('should show correct answer message when correct', () => {
      const question = createMockQuestion({ a: 1 });
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          question={question}
          selectedAnswer={1}
          isAnswered={true}
          isCorrect={true}
          showExplanation={true}
          onToggleExplanation={mockOnToggleExplanation}
        />
      );
      expect(screen.getByText(/tebrikler.*doğru cevap/i)).toBeInTheDocument();
    });
  });

  describe('Blank Answer', () => {
    it('should render blank button when onBlank is provided', () => {
      const question = createMockQuestion();
      renderWithRouter(
        <QuizCard {...defaultProps} question={question} onBlank={mockOnBlank} />
      );
      expect(
        screen.getByRole('button', { name: /boş bırak/i })
      ).toBeInTheDocument();
    });

    it('should hide blank button after answered', () => {
      const question = createMockQuestion();
      renderWithRouter(
        <QuizCard
          {...defaultProps}
          question={question}
          isAnswered={true}
          onBlank={mockOnBlank}
        />
      );
      expect(
        screen.queryByRole('button', { name: /boş bırak/i })
      ).not.toBeInTheDocument();
    });
  });
});
