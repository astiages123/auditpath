import { describe, expect, it } from 'vitest';
import {
  calculateNextQuestionState,
  calculatePreviousQuestionState,
} from '@/features/quiz/logic/quizEngineHelpers';
import type {
  QuizQuestion,
  QuizResults,
  QuizState,
} from '@/features/quiz/types';

const createQuestion = (id: string): QuizQuestion => ({
  id,
  q: `Question ${id}`,
  exp: `Explanation ${id}`,
  o: ['A', 'B'],
  a: 0,
  type: 'multiple_choice',
});

const baseResults: QuizResults = {
  correct: 1,
  incorrect: 0,
  blank: 0,
  totalTimeMs: 1000,
};

const createState = (overrides: Partial<QuizState> = {}): QuizState => ({
  currentQuestion: createQuestion('q2'),
  queue: [createQuestion('q3')],
  totalToGenerate: 2,
  generatedCount: 2,
  isLoading: false,
  error: null,
  selectedAnswer: 1,
  isAnswered: true,
  showExplanation: true,
  isCorrect: false,
  hasStarted: true,
  summary: null,
  currentMastery: 0,
  lastSubmissionResult: null,
  isReviewMode: false,
  answeredQuestionIds: [],
  history: [],
  ...overrides,
});

describe('quizEngineHelpers', () => {
  it('stores response type and answered ids when advancing from a solved question', () => {
    const state = createState();

    const patch = calculateNextQuestionState(state, baseResults);

    expect(patch.history).toHaveLength(1);
    expect(patch.history?.[0]).toMatchObject({
      id: 'q2',
      userAnswer: 1,
      isCorrect: false,
      responseType: 'incorrect',
    });
    expect(patch.answeredQuestionIds).toEqual(['q2']);
    expect(patch.currentQuestion?.id).toBe('q3');
    expect(patch.isReviewMode).toBe(false);
  });

  it('returns previous solved question in locked review mode', () => {
    const state = createState({
      currentQuestion: createQuestion('q3'),
      queue: [],
      selectedAnswer: null,
      isAnswered: false,
      showExplanation: false,
      isCorrect: null,
      answeredQuestionIds: ['q1', 'q2'],
      history: [
        {
          ...createQuestion('q1'),
          userAnswer: 0,
          isCorrect: true,
          responseType: 'correct',
        },
        {
          ...createQuestion('q2'),
          userAnswer: 1,
          isCorrect: false,
          responseType: 'incorrect',
        },
      ],
    });

    const patch = calculatePreviousQuestionState(state);

    expect(patch.currentQuestion?.id).toBe('q2');
    expect(patch.selectedAnswer).toBe(1);
    expect(patch.isAnswered).toBe(true);
    expect(patch.isCorrect).toBe(false);
    expect(patch.showExplanation).toBe(true);
    expect(patch.isReviewMode).toBe(true);
    expect(patch.queue?.map((question) => question.id)).toEqual(['q3']);
  });

  it('moves review navigation forward one question at a time for solved questions', () => {
    const state = createState({
      currentQuestion: createQuestion('q1'),
      queue: [createQuestion('q2'), createQuestion('q3'), createQuestion('q4')],
      selectedAnswer: 0,
      isAnswered: true,
      showExplanation: true,
      isCorrect: true,
      isReviewMode: true,
      answeredQuestionIds: ['q1', 'q2', 'q3'],
      history: [
        {
          ...createQuestion('q1'),
          userAnswer: 0,
          isCorrect: true,
          responseType: 'correct',
        },
        {
          ...createQuestion('q2'),
          userAnswer: 1,
          isCorrect: false,
          responseType: 'incorrect',
        },
        {
          ...createQuestion('q3'),
          userAnswer: 0,
          isCorrect: true,
          responseType: 'correct',
        },
      ],
    });

    const patch = calculateNextQuestionState(state, baseResults);

    expect(patch.currentQuestion?.id).toBe('q2');
    expect(patch.queue?.map((question) => question.id)).toEqual(['q3', 'q4']);
    expect(patch.isAnswered).toBe(true);
    expect(patch.selectedAnswer).toBe(1);
    expect(patch.isReviewMode).toBe(true);
  });

  it('returns to live mode when review navigation reaches the first unanswered question', () => {
    const state = createState({
      currentQuestion: createQuestion('q2'),
      queue: [createQuestion('q3')],
      selectedAnswer: 1,
      isAnswered: true,
      showExplanation: true,
      isCorrect: false,
      isReviewMode: true,
      answeredQuestionIds: ['q1', 'q2'],
      history: [
        {
          ...createQuestion('q1'),
          userAnswer: 0,
          isCorrect: true,
          responseType: 'correct',
        },
        {
          ...createQuestion('q2'),
          userAnswer: 1,
          isCorrect: false,
          responseType: 'incorrect',
        },
      ],
    });

    const patch = calculateNextQuestionState(state, baseResults);

    expect(patch.currentQuestion?.id).toBe('q3');
    expect(patch.queue).toEqual([]);
    expect(patch.isAnswered).toBe(false);
    expect(patch.selectedAnswer).toBeNull();
    expect(patch.isReviewMode).toBe(false);
  });
});
