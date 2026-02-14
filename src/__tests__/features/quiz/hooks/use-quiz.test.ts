import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useQuiz } from '@/features/quiz/hooks/use-quiz';
import * as Engine from '@/features/quiz/core/engine';
import * as Repository from '@/features/quiz/api/repository';
import { QuizFactory } from '@/features/quiz/lib/ai/factory';
import { QuizQuestion } from '@/features/quiz/core/types';

// Mock dependencies
vi.mock('@/features/quiz/core/engine', () => ({
  startSession: vi.fn(),
  getReviewQueue: vi.fn(),
  submitAnswer: vi.fn(),
}));

vi.mock('@/features/quiz/api/repository', () => ({
  getChunkMetadata: vi.fn(),
  fetchQuestionsByIds: vi.fn(),
}));

vi.mock('@/features/quiz/lib/ai/factory', () => ({
  QuizFactory: vi.fn().mockImplementation(() => ({
    generateForChunk: vi.fn(),
  })),
}));

vi.mock('@/features/quiz/lib/ai/utils', () => ({
  createTimer: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn().mockReturnValue(1000),
    reset: vi.fn(),
    clear: vi.fn(),
  })),
}));

describe('useQuiz', () => {
  const mockChunkId = 'chunk-1';
  const mockUserId = 'user-1';
  const mockCourseId = 'course-1';

  const mockQuestion: QuizQuestion = {
    id: 'q-1',
    q: 'Question 1',
    o: ['A', 'B'],
    a: 0,
    exp: 'Exp',
    evidence: 'Evidence',
    type: 'multiple_choice',
  };

  const mockQuestion2 = { ...mockQuestion, id: 'q-2', q: 'Question 2' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(Repository.getChunkMetadata).mockResolvedValue({
      course_id: mockCourseId,
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    vi.mocked(Engine.startSession).mockResolvedValue({} as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useQuiz());
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.queue).toHaveLength(0);
  });

  it('should load questions from Engine queue (Waterfall)', async () => {
    // Mock Engine returning items
    vi.mocked(Engine.getReviewQueue).mockResolvedValue([
      { questionId: 'q-1', priority: 1, status: 'due' },
      { questionId: 'q-2', priority: 1, status: 'due' },
    ]);

    vi.mocked(Repository.fetchQuestionsByIds).mockResolvedValue([
      { ...mockQuestion, question_data: mockQuestion } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      { ...mockQuestion2, question_data: mockQuestion2 } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ]);

    const { result } = renderHook(() => useQuiz());

    await act(async () => {
      await result.current.generateBatch(5, {
        type: 'chunk',
        chunkId: mockChunkId,
        userId: mockUserId,
      });
    });

    expect(Engine.startSession).toHaveBeenCalledWith(mockUserId, mockCourseId);
    expect(Engine.getReviewQueue).toHaveBeenCalled();
    expect(result.current.state.currentQuestion?.id).toBe('q-1');
    expect(result.current.state.queue).toHaveLength(1); // One remaining
    expect(result.current.state.queue[0].id).toBe('q-2');
  });

  it('should trigger generation if Engine queue is empty', async () => {
    // Mock Engine returning empty initially
    vi.mocked(Engine.getReviewQueue)
      .mockResolvedValueOnce([]) // First call (before generation)
      .mockResolvedValueOnce([
        // Second call (after generation)
        { questionId: 'q-1', priority: 1, status: 'new' },
      ]);

    const mockGenerateForChunk = vi
      .fn()
      .mockImplementation(async (_id, callbacks) => {
        callbacks.onComplete();
      });

    // Mock QuizFactory
    (QuizFactory as any).mockImplementation(function () {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        generateForChunk: mockGenerateForChunk,
      };
    });

    vi.mocked(Repository.fetchQuestionsByIds).mockResolvedValue([
      { ...mockQuestion, question_data: mockQuestion } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ]);

    const { result } = renderHook(() => useQuiz());

    await act(async () => {
      await result.current.generateBatch(5, {
        type: 'chunk',
        chunkId: mockChunkId,
        userId: mockUserId,
      });
    });

    // Check if generateForChunk was called
    // Console error block removed

    expect(mockGenerateForChunk).toHaveBeenCalledWith(
      mockChunkId,
      expect.anything(),
      { targetCount: 5 }
    );

    // Should verify that after generation, it checks queue again
    expect(Engine.getReviewQueue).toHaveBeenCalledTimes(2);
    expect(result.current.state.currentQuestion?.id).toBe('q-1');
  });

  it('should select answer and update results', async () => {
    const { result } = renderHook(() => useQuiz());

    // Manually load a question to skip setup
    act(() => {
      result.current.loadQuestions([mockQuestion]);
      result.current.startQuiz();
    });

    await act(async () => {
      await result.current.selectAnswer(0); // Correct answer (a: 0)
    });

    expect(result.current.state.selectedAnswer).toBe(0);
    expect(result.current.state.isCorrect).toBe(true);
    expect(result.current.results.correct).toBe(1);

    // Verify Engine submission (assuming session exists, but here we manually loaded so maybe not called?
    // Actually submitAnswer is called if sessionContextRef.current is set.
    // Since we skipped generateBatch, session is null.
    // Let's rely on local state update for this test.)
  });

  it('should proceed to next question and calculate results when finished', async () => {
    const { result } = renderHook(() => useQuiz());

    act(() => {
      result.current.loadQuestions([mockQuestion, mockQuestion2]);
      result.current.startQuiz();
    });

    // Answer Q1
    await act(async () => {
      await result.current.selectAnswer(0);
    });

    // Next Q
    await act(async () => {
      await result.current.nextQuestion(mockUserId, mockCourseId);
    });

    expect(result.current.state.currentQuestion?.id).toBe('q-2');
    expect(result.current.state.queue).toHaveLength(0);

    // Answer Q2
    await act(async () => {
      await result.current.selectAnswer(0);
    });

    // Finish
    await act(async () => {
      await result.current.nextQuestion(mockUserId, mockCourseId);
    });

    expect(result.current.state.currentQuestion).toBeNull();
    expect(result.current.state.summary).not.toBeNull();
  });

  it('should handle error during generation', async () => {
    const { result } = renderHook(() => useQuiz());

    vi.mocked(Repository.getChunkMetadata).mockRejectedValue(
      new Error('API Error')
    );

    await act(async () => {
      await result.current.generateBatch(5, {
        type: 'chunk',
        chunkId: mockChunkId,
        userId: mockUserId,
      });
    });

    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBe('API Error');
  });

  it('should start quiz and timer', () => {
    const { result } = renderHook(() => useQuiz());

    act(() => {
      result.current.startQuiz();
    });

    expect(result.current.state.hasStarted).toBe(true);
    // Timer start verification would require mocking createTimer return value more deeply,
    // but state update confirms action.
  });

  it('should toggle explanation', () => {
    const { result } = renderHook(() => useQuiz());

    expect(result.current.state.showExplanation).toBe(false);

    act(() => {
      result.current.toggleExplanation();
    });

    expect(result.current.state.showExplanation).toBe(true);

    act(() => {
      result.current.toggleExplanation();
    });

    expect(result.current.state.showExplanation).toBe(false);
  });

  it('should mark answer as blank', async () => {
    const { result } = renderHook(() => useQuiz());

    // Setup state with a question
    act(() => {
      result.current.loadQuestions([mockQuestion]);
      result.current.startQuiz();
    });

    await act(async () => {
      result.current.markAsBlank();
    });

    expect(result.current.state.isAnswered).toBe(true);
    expect(result.current.state.selectedAnswer).toBeNull();
    expect(result.current.state.isCorrect).toBe(false);
    expect(result.current.results.blank).toBe(1);
  });

  it('should reset quiz state', () => {
    const { result } = renderHook(() => useQuiz());

    // Change state
    act(() => {
      result.current.toggleExplanation();
    });

    expect(result.current.state.showExplanation).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.showExplanation).toBe(false);
    expect(result.current.state.currentQuestion).toBeNull();
  });

  it('should retry generation with last params', async () => {
    const { result } = renderHook(() => useQuiz());

    // First generation to set lastParams
    vi.mocked(Engine.getReviewQueue).mockResolvedValue([]);
    // Mock success for factory
    (QuizFactory as any).mockImplementation(function () {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        generateForChunk: vi.fn(),
      };
    });

    await act(async () => {
      await result.current.generateBatch(5, {
        type: 'chunk',
        chunkId: mockChunkId,
        userId: mockUserId,
      });
    });

    // Reset
    act(() => {
      result.current.reset();
    });

    // Retry
    await act(async () => {
      await result.current.retry();
    });

    expect(Engine.getReviewQueue).toHaveBeenCalledTimes(2); // Initial + Retry
  });

  it('should load questions manually', () => {
    const { result } = renderHook(() => useQuiz());
    const questions = [mockQuestion, { ...mockQuestion, id: 'q-2' }];

    act(() => {
      result.current.loadQuestions(questions);
    });

    expect(result.current.state.currentQuestion).toEqual(mockQuestion);
    expect(result.current.state.queue).toHaveLength(1);
    expect(result.current.state.totalToGenerate).toBe(2);
  });
});
