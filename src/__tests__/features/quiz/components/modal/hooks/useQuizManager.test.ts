import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuizManager } from '@/features/quiz/components/modal/hooks/useQuizManager';
import * as clientDb from '@/shared/lib/core/client-db';

vi.mock('@/shared/lib/core/client-db', () => ({
  getCourseTopicsWithCounts: vi.fn(),
  getFirstChunkIdForTopic: vi.fn(),
  getTopicCompletionStatus: vi.fn(),
  getTopicQuestionCount: vi.fn(),
}));

vi.mock('@/features/quiz/core/factory', () => ({
  QuizFactory: vi.fn().mockImplementation(() => ({
    generateForChunk: vi.fn(),
  })),
}));

vi.mock('@/features/quiz/core/engine', () => ({
  ExamService: {
    fetchSmartExamFromPool: vi.fn(),
    generateSmartExam: vi.fn(),
  },
}));

vi.mock('@/features/quiz/api/repository', () => ({
  fetchQuestionsByIds: vi.fn(),
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
  }),
}));

describe('useQuizManager', () => {
  const mockCourseId = 'course-456';
  const mockCourseName = 'Test Course';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have empty topics initially', () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([]);

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: false,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      expect(result.current.topics).toEqual([]);
    });

    it('should have null selectedTopic initially', () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([]);

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: false,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      expect(result.current.selectedTopic).toBeNull();
    });

    it('should not be generating exam initially', () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([]);

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: false,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      expect(result.current.isGeneratingExam).toBe(false);
    });

    it('should not have quiz active initially', () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([]);

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: false,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      expect(result.current.isQuizActive).toBe(false);
    });
  });

  describe('Topic Loading', () => {
    it('should load topics when modal opens', async () => {
      const mockTopics = [
        {
          name: 'Topic 1',
          isCompleted: false,
          counts: { antrenman: 5, arsiv: 10, deneme: 0, total: 15 },
        },
      ];

      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue(
        mockTopics
      );

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: true,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await waitFor(
        () => {
          expect(result.current.topics).toEqual(mockTopics);
        },
        { timeout: 3000 }
      );
    });

    it('should handle empty topics array', async () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([]);

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: true,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await waitFor(
        () => {
          expect(result.current.topics).toEqual([]);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('handleBackToTopics', () => {
    it('should reset selected topic', async () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([]);

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: false,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await act(async () => {
        result.current.handleBackToTopics();
      });

      expect(result.current.selectedTopic).toBeNull();
    });

    it('should reset isQuizActive', async () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([]);

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: false,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await act(async () => {
        result.current.handleBackToTopics();
      });

      expect(result.current.isQuizActive).toBe(false);
    });

    it('should reset exam logs', async () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([]);

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: false,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await act(async () => {
        result.current.handleBackToTopics();
      });

      expect(result.current.examLogs).toEqual([]);
    });

    it('should reset existing questions', async () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([]);

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: false,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await act(async () => {
        result.current.handleBackToTopics();
      });

      expect(result.current.existingQuestions).toEqual([]);
    });
  });

  describe('resetState', () => {
    it('should reset all state', async () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([]);

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: false,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await act(async () => {
        result.current.resetState();
      });

      expect(result.current.selectedTopic).toBeNull();
      expect(result.current.isQuizActive).toBe(false);
      expect(result.current.existingQuestions).toEqual([]);
    });
  });

  describe('setSelectedTopic', () => {
    it('should allow setting a topic', async () => {
      const mockTopics = [
        {
          name: 'Topic 1',
          isCompleted: false,
          counts: { antrenman: 5, arsiv: 10, deneme: 0, total: 15 },
        },
      ];
      const mockTopic = mockTopics[0];

      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue(
        mockTopics
      );
      vi.mocked(clientDb.getFirstChunkIdForTopic).mockResolvedValue(
        'chunk-123'
      );
      vi.mocked(clientDb.getTopicCompletionStatus).mockResolvedValue({
        completed: false,
        antrenman: { solved: 3, total: 10, quota: 10, existing: 3 },
        arsiv: { solved: 5, total: 5, quota: 5, existing: 5, srsDueCount: 0 },
        deneme: { solved: 2, total: 5, quota: 5, existing: 2 },
        mistakes: { solved: 1, total: 5, existing: 1 },
        aiLogic: { suggested_quotas: { antrenman: 5, arsiv: 2, deneme: 2 } },
        concepts: [],
      });

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: true,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await waitFor(
        () => {
          expect(result.current.topics).toEqual(mockTopics);
        },
        { timeout: 3000 }
      );

      await act(async () => {
        result.current.setSelectedTopic(mockTopic);
      });

      await waitFor(
        () => {
          expect(result.current.selectedTopic).toEqual(mockTopic);
        },
        { timeout: 3000 }
      );
    });

    it('should allow clearing selected topic', async () => {
      const mockTopics = [
        {
          name: 'Topic 1',
          isCompleted: false,
          counts: { antrenman: 5, arsiv: 10, deneme: 0, total: 15 },
        },
      ];
      const mockTopic = mockTopics[0];

      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue(
        mockTopics
      );
      vi.mocked(clientDb.getFirstChunkIdForTopic).mockResolvedValue(null);
      vi.mocked(clientDb.getTopicCompletionStatus).mockResolvedValue({
        completed: false,
        antrenman: { solved: 0, total: 5, quota: 5, existing: 0 },
        arsiv: { solved: 0, total: 2, quota: 2, existing: 0, srsDueCount: 0 },
        deneme: { solved: 0, total: 2, quota: 2, existing: 0 },
        mistakes: { solved: 0, total: 3, existing: 0 },
        concepts: [],
      });

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: true,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await waitFor(
        () => {
          expect(result.current.topics).toEqual(mockTopics);
        },
        { timeout: 3000 }
      );

      await act(async () => {
        result.current.setSelectedTopic(mockTopic);
      });

      await waitFor(
        () => {
          expect(result.current.selectedTopic).toEqual(mockTopic);
        },
        { timeout: 3000 }
      );

      await act(async () => {
        result.current.setSelectedTopic(null);
      });

      await waitFor(
        () => {
          expect(result.current.selectedTopic).toBeNull();
        },
        { timeout: 3000 }
      );
    });
  });
});
