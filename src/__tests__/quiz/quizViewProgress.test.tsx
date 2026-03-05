// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuizView } from '@/features/quiz/components/views/QuizView';
import type { QuizState } from '@/features/quiz/types';

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

describe('QuizView progress dots', () => {
  it('keeps solved question colors for history and current question', () => {
    const state: QuizState = {
      isLoading: false,
      error: null,
      hasStarted: true,
      currentQuestion: {
        id: 'q3',
        q: 'Q3',
        exp: 'Q3 explanation',
        o: ['A', 'B'],
        a: 0,
        type: 'multiple_choice',
      },
      queue: [
        {
          id: 'q4',
          q: 'Q4',
          exp: 'Q4 explanation',
          o: ['A', 'B'],
          a: 0,
          type: 'multiple_choice',
        },
      ],
      history: [
        {
          id: 'q1',
          q: 'Q1',
          exp: 'Q1 explanation',
          o: ['A', 'B'],
          a: 0,
          type: 'multiple_choice',
          userAnswer: 0,
          isCorrect: true,
          responseType: 'correct',
        },
        {
          id: 'q2',
          q: 'Q2',
          exp: 'Q2 explanation',
          o: ['A', 'B'],
          a: 0,
          type: 'multiple_choice',
          userAnswer: 1,
          isCorrect: false,
          responseType: 'incorrect',
        },
      ],
      generatedCount: 4,
      totalToGenerate: 4,
      selectedAnswer: null,
      isAnswered: true,
      isCorrect: null,
      showExplanation: false,
      summary: null,
      currentMastery: 0,
      lastSubmissionResult: null,
      isReviewMode: true,
      answeredQuestionIds: ['q1', 'q2', 'q3'],
    };

    const { container } = render(
      <QuizView state={state} progressIndex={2} {...handlers} />
    );

    expect(
      container.querySelectorAll('.w-2.h-2.rounded-full.bg-primary')
    ).toHaveLength(2);
    expect(
      container.querySelectorAll('.w-2.h-2.rounded-full.bg-red-500')
    ).toHaveLength(2);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
  });
});
