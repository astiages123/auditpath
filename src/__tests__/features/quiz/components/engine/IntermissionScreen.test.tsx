import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntermissionScreen } from '@/features/quiz/components/engine/IntermissionScreen';
import { ReviewItem } from '@/features/quiz/core/types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    ),
  },
}));

describe('IntermissionScreen', () => {
  const defaultProps = {
    batchIndex: 0,
    totalBatches: 3,
    completedBatchQuestions: [] as ReviewItem[],
    onContinue: vi.fn(),
    correctCount: 8,
    incorrectCount: 2,
  };

  it('renders correctly with given props', () => {
    render(<IntermissionScreen {...defaultProps} />);

    // Check batch index display (0 + 1 => "1. Set Tamamlandı!")
    expect(screen.getByText('1. Set Tamamlandı!')).toBeInTheDocument();

    // Check remaining batches calculation (3 - (0 + 1) => 2)
    expect(screen.getByText(/Sırada 2 set daha/)).toBeInTheDocument();

    // Check counts
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onContinue when the button is clicked', () => {
    render(<IntermissionScreen {...defaultProps} />);

    const button = screen.getByRole('button', { name: /Sıradaki Sete Geç/i });
    fireEvent.click(button);

    expect(defaultProps.onContinue).toHaveBeenCalledTimes(1);
  });

  it('calculates batch display correctly for different index', () => {
    render(
      <IntermissionScreen {...defaultProps} batchIndex={1} totalBatches={5} />
    );

    // Batch index 1 => "2. Set"
    expect(screen.getByText('2. Set Tamamlandı!')).toBeInTheDocument();

    // Remaining: 5 - (1 + 1) = 3
    expect(screen.getByText(/Sırada 3 set daha/)).toBeInTheDocument();
  });

  it('renders with default counts if not provided', () => {
    render(
      <IntermissionScreen
        batchIndex={0}
        totalBatches={1}
        completedBatchQuestions={[]}
        onContinue={vi.fn()}
      />
    );

    // Should default to 0
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2); // One for correct, one for incorrect
  });
});
