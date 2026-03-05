// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizEngine } from '@/features/quiz/hooks/useQuizEngine';
import type { QuizQuestion } from '@/features/quiz/types';

const mockLoadEngine = vi.fn();
const mockSaveEngine = vi.fn();
const mockClearEngine = vi.fn();
const mockStartQuizSession = vi.fn();
const mockLoadQuestionsFromQueue = vi.fn();
const mockGenerateAndLoadQuestions = vi.fn();
const mockLoadRandomQuestions = vi.fn();
const mockSubmitAnswer = vi.fn();
const mockStartTimer = vi.fn();
const mockStopTimer = vi.fn(() => 5000);
const mockResetTimer = vi.fn();
const mockDecrementClientQuota = vi.fn();
const mockEnqueueCelebration = vi.fn();

vi.mock('@/features/quiz/hooks/useQuizPersistence', () => ({
  useQuizPersistence: () => ({
    loadEngine: mockLoadEngine,
    saveEngine: mockSaveEngine,
    clearEngine: mockClearEngine,
  }),
}));

vi.mock('@/features/quiz/hooks/useQuizEngineApi', () => ({
  useQuizEngineApi: () => ({
    startQuizSession: mockStartQuizSession,
    loadQuestionsFromQueue: mockLoadQuestionsFromQueue,
    generateAndLoadQuestions: mockGenerateAndLoadQuestions,
    loadRandomQuestions: mockLoadRandomQuestions,
    submitAnswer: mockSubmitAnswer,
  }),
}));

vi.mock('@/features/quiz/hooks/useQuizTimer', () => ({
  useQuizTimer: () => ({
    startTimer: mockStartTimer,
    stopTimer: mockStopTimer,
    resetTimer: mockResetTimer,
  }),
}));

vi.mock('@/features/quiz/store/useQuotaStore', () => ({
  useQuotaStore: {
    getState: () => ({
      decrementClientQuota: mockDecrementClientQuota,
    }),
  },
}));

vi.mock('@/features/achievements/store', () => ({
  useCelebrationStore: {
    getState: () => ({
      enqueueCelebration: mockEnqueueCelebration,
    }),
  },
}));

vi.mock('@/shared/services/pomodoroAdapter', () => ({
  pomodoroAdapter: {
    associateQuizWithPomodoro: vi.fn(),
  },
}));

const createQuestion = (id: string): QuizQuestion => ({
  id,
  q: `Question ${id}`,
  exp: `Explanation ${id}`,
  o: ['A', 'B'],
  a: 0,
  type: 'multiple_choice',
});

describe('useQuizEngine review mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadEngine.mockReturnValue(null);
    mockStartQuizSession.mockResolvedValue({
      userId: 'user-1',
      courseId: 'course-1',
      sessionNumber: 1,
      isNewSession: true,
    });
    mockLoadQuestionsFromQueue.mockResolvedValue([
      createQuestion('q1'),
      createQuestion('q2'),
    ]);
    mockSubmitAnswer.mockResolvedValue({
      isCorrect: true,
      scoreDelta: 10,
      newMastery: 10,
      newStatus: 'reviewing',
      nextReviewSession: 2,
      newRepCount: 1,
    });
  });

  it('keeps review navigation sequential before returning to live mode', async () => {
    const { result } = renderHook(() => useQuizEngine('course-1'));

    mockLoadQuestionsFromQueue.mockResolvedValue([
      createQuestion('q1'),
      createQuestion('q2'),
      createQuestion('q3'),
    ]);

    await act(async () => {
      await result.current.startQuiz('user-1', 'course-1');
    });

    act(() => {
      result.current.selectAnswer(0);
    });

    await act(async () => {
      await result.current.submitAnswer('correct');
    });

    act(() => {
      result.current.nextQuestion();
    });

    act(() => {
      result.current.selectAnswer(0);
    });

    await act(async () => {
      await result.current.submitAnswer('correct');
    });

    act(() => {
      result.current.nextQuestion();
    });

    act(() => {
      result.current.previousQuestion();
    });

    act(() => {
      result.current.previousQuestion();
    });

    expect(result.current.state.isReviewMode).toBe(true);
    expect(result.current.state.isAnswered).toBe(true);
    expect(result.current.state.selectedAnswer).toBe(0);

    act(() => {
      result.current.selectAnswer(1);
    });

    expect(result.current.state.selectedAnswer).toBe(0);

    await act(async () => {
      await result.current.submitAnswer('correct');
    });

    expect(mockSubmitAnswer).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.nextQuestion();
    });

    expect(result.current.state.isReviewMode).toBe(true);
    expect(result.current.state.currentQuestion?.id).toBe('q2');
    expect(result.current.state.isAnswered).toBe(true);
    expect(result.current.state.selectedAnswer).toBe(0);

    act(() => {
      result.current.nextQuestion();
    });

    expect(result.current.state.isReviewMode).toBe(false);
    expect(result.current.state.currentQuestion?.id).toBe('q3');
    expect(result.current.state.isAnswered).toBe(false);
    expect(result.current.state.selectedAnswer).toBeNull();
  });
});
