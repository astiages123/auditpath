// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuizView } from '@/features/quiz/components/views/QuizView';
import type { QuizResults, QuizState } from '@/features/quiz/types';

const capturedResults: { current: QuizResults | null } = { current: null };

vi.mock('@/features/quiz/components/views/QuizResultsView', () => ({
  QuizResultsView: ({ results }: { results: QuizResults }) => {
    capturedResults.current = results;
    return <div>mocked-results-view</div>;
  },
}));

const handlers = {
  onConfirm: vi.fn(),
  onBlank: vi.fn(),
  onNext: vi.fn(),
  onPrev: vi.fn(),
  onSelect: vi.fn(),
  onToggleExplanation: vi.fn(),
  onRetry: vi.fn(),
  onClose: vi.fn(),
};

describe('QuizView results screen', () => {
  it('passes real quiz counts instead of summary-derived mastery fields', () => {
    capturedResults.current = null;

    const state: QuizState = {
      currentQuestion: null,
      queue: [],
      totalToGenerate: 3,
      generatedCount: 3,
      isLoading: false,
      error: null,
      selectedAnswer: null,
      isAnswered: false,
      showExplanation: false,
      isCorrect: null,
      hasStarted: false,
      summary: {
        percentage: 67,
        masteryScore: 47,
        pendingReview: 2,
        totalTimeFormatted: '0:45',
      },
      currentMastery: 0,
      lastSubmissionResult: null,
      isReviewMode: false,
      answeredQuestionIds: ['q1', 'q2', 'q3'],
      history: [],
    };

    const results: QuizResults = {
      correct: 2,
      incorrect: 1,
      blank: 0,
      totalTimeMs: 45000,
    };

    render(
      <QuizView
        state={state}
        results={results}
        progressIndex={2}
        {...handlers}
      />
    );

    expect(screen.getByText('mocked-results-view')).toBeInTheDocument();
    expect(capturedResults.current).toEqual(results);
  });
});
