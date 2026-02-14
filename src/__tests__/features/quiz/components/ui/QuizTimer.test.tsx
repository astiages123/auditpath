import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuizTimer } from '@/features/quiz/components/ui/QuizTimer';

describe('QuizTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initial time as 00:00', () => {
    render(<QuizTimer isRunning={false} />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('starts timing when isRunning is true', () => {
    render(<QuizTimer isRunning={true} />);

    // Advance time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('00:05')).toBeInTheDocument();
  });

  it('does not advance time when isRunning is false', () => {
    render(<QuizTimer isRunning={false} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('formats minutes and seconds correctly', () => {
    render(<QuizTimer isRunning={true} />);

    // Advance by 65 seconds (1:05)
    act(() => {
      vi.advanceTimersByTime(65000);
    });

    expect(screen.getByText('01:05')).toBeInTheDocument();
  });

  it('clears interval on unmount', () => {
    const { unmount } = render(<QuizTimer isRunning={true} />);

    // Spy on clearInterval
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
