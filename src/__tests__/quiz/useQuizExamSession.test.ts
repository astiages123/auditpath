// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockFetchGeneratedQuestionsByCourse,
  mockFetchQuestionsByIds,
  mockGenerateSmartExam,
  mockGetTopicCompletionStatus,
  mockGenerateForChunk,
} = vi.hoisted(() => ({
  mockFetchGeneratedQuestionsByCourse: vi.fn(),
  mockFetchQuestionsByIds: vi.fn(),
  mockGenerateSmartExam: vi.fn(),
  mockGetTopicCompletionStatus: vi.fn(),
  mockGenerateForChunk: vi.fn(),
}));

vi.mock('@/features/quiz/services/quizRepository', () => ({
  fetchGeneratedQuestionsByCourse: mockFetchGeneratedQuestionsByCourse,
}));

vi.mock('@/features/quiz/services/quizReadService', () => ({
  fetchQuestionsByIds: mockFetchQuestionsByIds,
}));

vi.mock('@/features/quiz/services/quizGenerationService', () => ({
  generateSmartExam: mockGenerateSmartExam,
}));

vi.mock('@/features/quiz/services/quizStatusService', () => ({
  getTopicCompletionStatus: mockGetTopicCompletionStatus,
}));

vi.mock('@/features/quiz/logic/quizParser', () => ({
  generateForChunk: mockGenerateForChunk,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { useQuizExamSession } from '@/features/quiz/hooks/useQuizExamSession';
import type {
  TopicCompletionStats,
  TopicWithCounts,
} from '@/features/courses/types/courseTypes';

function makeStoredQuestion(id: string) {
  return {
    id,
    question_data: {
      q: `Question ${id}`,
      exp: 'Explanation',
      o: ['A', 'B', 'C', 'D', 'E'],
      a: 0,
      type: 'multiple_choice' as const,
    },
  };
}

describe('useQuizExamSession', () => {
  const selectedTopic: TopicWithCounts = {
    name: 'Genel Esaslar',
    isCompleted: false,
    counts: {
      antrenman: 0,
      deneme: 0,
      total: 0,
    },
  };

  const completionStatus: TopicCompletionStats = {
    completed: false,
    antrenman: { solved: 10, total: 10, quota: 10, existing: 10 },
    deneme: { solved: 0, total: 5, quota: 5, existing: 2 },
    mistakes: { solved: 0, total: 0, existing: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTopicCompletionStatus.mockResolvedValue(completionStatus);
  });

  function renderSubject() {
    const setSelectedTopic = vi.fn();
    const setCompletionStatus = vi.fn();
    const setIsQuizActive = vi.fn();
    const resetGeneration = vi.fn();
    const refreshTopics = vi.fn();

    const hook = renderHook(() =>
      useQuizExamSession({
        courseId: 'course-1',
        courseName: 'Audit Path',
        userId: 'user-1',
        selectedTopic,
        chunkId: 'chunk-1',
        completionStatus,
        setSelectedTopic,
        setCompletionStatus,
        setIsQuizActive,
        resetGeneration,
        refreshTopics,
      })
    );

    return {
      ...hook,
      setSelectedTopic,
      setCompletionStatus,
      setIsQuizActive,
      resetGeneration,
      refreshTopics,
    };
  }

  it('starts smart exam from the existing pool when 20 questions are available', async () => {
    mockFetchGeneratedQuestionsByCourse.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) =>
        makeStoredQuestion(`pool-${index + 1}`)
      )
    );

    const { result, setIsQuizActive, setSelectedTopic } = renderSubject();

    await act(async () => {
      await result.current.handleStartSmartExam();
    });

    expect(mockGenerateSmartExam).not.toHaveBeenCalled();
    expect(result.current.existingQuestions).toHaveLength(20);
    expect(setIsQuizActive).toHaveBeenCalledWith(true);
    expect(setSelectedTopic).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Karma Deneme Sınavı',
        counts: expect.objectContaining({
          deneme: 20,
          total: 20,
        }),
      })
    );
  });

  it('falls back to generated questions when the pool is insufficient', async () => {
    mockFetchGeneratedQuestionsByCourse.mockResolvedValue([
      makeStoredQuestion('pool-1'),
    ]);
    mockGenerateSmartExam.mockResolvedValue({
      success: true,
      questionIds: ['generated-1', 'generated-2'],
    });
    mockFetchQuestionsByIds.mockResolvedValue([
      makeStoredQuestion('generated-1'),
      makeStoredQuestion('generated-2'),
    ]);

    const { result, setIsQuizActive, setSelectedTopic } = renderSubject();

    await act(async () => {
      await result.current.handleStartSmartExam();
    });

    expect(mockGenerateSmartExam).toHaveBeenCalledWith('course-1', 'user-1');
    expect(mockFetchQuestionsByIds).toHaveBeenCalledWith([
      'generated-1',
      'generated-2',
    ]);
    expect(result.current.existingQuestions).toHaveLength(2);
    expect(setIsQuizActive).toHaveBeenCalledWith(true);
    expect(setSelectedTopic).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Karma Deneme Sınavı',
      })
    );
  });

  it('keeps the quiz inactive when generated exam questions cannot be fetched', async () => {
    mockFetchGeneratedQuestionsByCourse.mockResolvedValue([]);
    mockGenerateSmartExam.mockResolvedValue({
      success: true,
      questionIds: ['generated-1'],
    });
    mockFetchQuestionsByIds.mockResolvedValue(null);

    const { result, setIsQuizActive, setSelectedTopic } = renderSubject();

    await act(async () => {
      await result.current.handleStartSmartExam();
    });

    expect(result.current.existingQuestions).toEqual([]);
    expect(setIsQuizActive).not.toHaveBeenCalledWith(true);
    expect(setSelectedTopic).not.toHaveBeenCalled();
  });

  it('triggers background generation on finish only when deneme quota is missing and refreshes completion status', async () => {
    mockGenerateForChunk.mockImplementation(
      async (
        _chunkId: string,
        callbacks: { onComplete: () => Promise<void> },
        _options: unknown
      ) => {
        await callbacks.onComplete();
      }
    );

    const nextCompletionStatus: TopicCompletionStats = {
      ...completionStatus,
      deneme: { ...completionStatus.deneme, existing: 5 },
    };
    mockGetTopicCompletionStatus
      .mockResolvedValueOnce(completionStatus)
      .mockResolvedValueOnce(nextCompletionStatus);

    const { result, setCompletionStatus, setIsQuizActive } = renderSubject();

    await act(async () => {
      await result.current.handleFinishQuiz();
    });

    expect(setIsQuizActive).toHaveBeenCalledWith(false);
    expect(mockGenerateForChunk).toHaveBeenCalledWith(
      'chunk-1',
      expect.objectContaining({
        onComplete: expect.any(Function),
      }),
      { usageType: 'deneme', userId: 'user-1' }
    );

    await waitFor(() => {
      expect(setCompletionStatus).toHaveBeenNthCalledWith(1, completionStatus);
      expect(setCompletionStatus).toHaveBeenNthCalledWith(
        2,
        nextCompletionStatus
      );
    });
  });

  it('skips background generation when deneme quota is already full', async () => {
    mockGetTopicCompletionStatus.mockResolvedValue({
      ...completionStatus,
      deneme: { ...completionStatus.deneme, existing: 5 },
    });

    const { result } = renderSubject();

    await act(async () => {
      await result.current.handleFinishQuiz();
    });

    expect(mockGenerateForChunk).not.toHaveBeenCalled();
  });
});
