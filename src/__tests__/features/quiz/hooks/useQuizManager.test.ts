import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  QuizState,
  useQuizManager,
} from '@/features/quiz/hooks/useQuizManager';
import * as clientDb from '@/shared/lib/core/client-db';
import { ExamService } from '@/features/quiz/core/engine';
import {
  mockRepository,
  mockUseAuth,
  mockUser,
  resetMocks,
} from '@/__tests__/utils/quiz-test-utils';

// Mocks
vi.mock('@/shared/lib/core/client-db', () => ({
  getCourseTopicsWithCounts: vi.fn(),
  getFirstChunkIdForTopic: vi.fn(),
  getTopicCompletionStatus: vi.fn(),
  getTopicQuestionCount: vi.fn(),
}));

vi.mock('@/features/quiz/lib/ai/factory', () => {
  let resolveGen: () => void;
  type GenerateCallbacks = {
    onComplete?: () => void;
    onError?: (error: string) => void;
  };
  const mockGenerate = vi.fn(
    (_chunkId: string, _callbacks?: GenerateCallbacks) => {
      return new Promise<void>((resolve) => {
        resolveGen = () => {
          if (_callbacks && _callbacks.onComplete) {
            _callbacks.onComplete();
          }
          resolve();
        };
      });
    }
  );

  return {
    mockGenerate,
    QuizFactory: class MockQuizFactory {
      generateForChunk(_chunkId: string, _callbacks?: GenerateCallbacks) {
        return mockGenerate(_chunkId, _callbacks);
      }
      static triggerComplete() {
        if (resolveGen) resolveGen();
      }
    },
  };
});

vi.mock('@/features/quiz/core/engine', () => ({
  ExamService: {
    fetchSmartExamFromPool: vi.fn(),
    generateSmartExam: vi.fn(),
  },
}));

vi.mock('@/features/quiz/api/repository', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return utils.mockRepository;
});

vi.mock('@/features/auth', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return { useAuth: utils.mockUseAuth };
});

vi.mock('@/shared/lib/core/utils/logger', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return { logger: utils.mockLogger };
});

describe('useQuizManager', () => {
  const mockCourseId = 'course-456';
  const mockCourseName = 'Test Course';

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser as typeof mockUser });
  });

  describe('Topic Selection & Status', () => {
    it('should update targetChunkId and completionStatus when topic selected', async () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([
        {
          name: 'Topic 1',
          isCompleted: false,
          counts: { antrenman: 0, arsiv: 0, deneme: 0, total: 10 },
        },
      ]);
      vi.mocked(clientDb.getFirstChunkIdForTopic).mockResolvedValue('chunk-1');
      vi.mocked(clientDb.getTopicCompletionStatus).mockResolvedValue({
        completed: false,
        antrenman: { solved: 0, total: 0, quota: 0, existing: 0 },
        deneme: { solved: 0, total: 0, quota: 0, existing: 0 },
        arsiv: { solved: 0, total: 0, quota: 0, existing: 0, srsDueCount: 0 },
        mistakes: { solved: 0, total: 0, existing: 0 },
        aiLogic: { suggested_quotas: { antrenman: 0, arsiv: 0, deneme: 0 } },
        concepts: [],
      });

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: true,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await waitFor(() => {
        expect(result.current.topics).toHaveLength(1);
      });

      await act(async () => {
        result.current.setSelectedTopic(result.current.topics[0]);
      });

      await waitFor(() => {
        expect(result.current.targetChunkId).toBe('chunk-1');
        expect(result.current.completionStatus).not.toBeNull();
      });
    });
  });

  describe('State Logic', () => {
    it('should transition: NOT_ANALYZED -> MAPPING -> BRIEFING -> ACTIVE', async () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([
        {
          name: 'Topic 1',
          isCompleted: false,
          counts: { antrenman: 0, arsiv: 0, deneme: 0, total: 10 },
        },
      ]);
      vi.mocked(clientDb.getTopicCompletionStatus).mockResolvedValue({
        completed: false,
        antrenman: { solved: 0, total: 0, quota: 10, existing: 0 },
        deneme: { solved: 0, total: 0, quota: 0, existing: 0 },
        arsiv: { solved: 0, total: 0, quota: 0, existing: 0, srsDueCount: 0 },
        mistakes: { solved: 0, total: 0, existing: 0 },
        aiLogic: { suggested_quotas: { antrenman: 0, arsiv: 0, deneme: 0 } },
        concepts: [
          {
            baslik: 'Concept 1',
            odak: '',
            seviye: 'Bilgi',
            gorsel: '',
          },
        ],
      });
      vi.mocked(clientDb.getFirstChunkIdForTopic).mockResolvedValue('chunk-1');

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: true,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      expect(result.current.quizState).toBe(QuizState.NOT_ANALYZED);

      await waitFor(() => {
        expect(result.current.topics).toHaveLength(1);
      });

      await act(async () => {
        if (result.current.topics[0]) {
          result.current.setSelectedTopic(result.current.topics[0]);
        }
      });

      await waitFor(
        () => {
          expect(result.current.completionStatus).not.toBeNull();
          expect(result.current.quizState).toBe(QuizState.BRIEFING);
        },
        { timeout: 3000 }
      );

      let promise: Promise<void> | void;
      await act(async () => {
        promise = result.current.handleStartQuiz();
      });

      await waitFor(() => {
        expect(result.current.quizState).toBe(QuizState.MAPPING);
      });

      const { QuizFactory } = await import('@/features/quiz/lib/ai/factory');
      await act(async () => {
        // eslint-disable-next-line no-restricted-syntax
        const MockFactory = QuizFactory as unknown as Record<string, unknown>;
        (MockFactory.triggerComplete as () => void)();
        if (promise) await promise;
      });

      await waitFor(() => {
        expect(result.current.quizState).toBe(QuizState.BRIEFING);
      });

      vi.mocked(clientDb.getTopicCompletionStatus).mockResolvedValue({
        completed: false,
        antrenman: { solved: 0, total: 0, quota: 10, existing: 10 },
        deneme: { solved: 0, total: 0, quota: 0, existing: 0 },
        arsiv: { solved: 0, total: 0, quota: 0, existing: 0, srsDueCount: 0 },
        mistakes: { solved: 0, total: 0, existing: 0 },
        aiLogic: { suggested_quotas: { antrenman: 0, arsiv: 0, deneme: 0 } },
        concepts: [
          {
            baslik: 'Concept 1',
            odak: '',
            seviye: 'Bilgi',
            gorsel: '',
          },
        ],
      });

      await act(async () => {
        result.current.setSelectedTopic(null);
      });
      await act(async () => {
        result.current.setSelectedTopic({
          name: 'Topic 1',
          isCompleted: false,
          counts: { antrenman: 0, arsiv: 0, deneme: 0, total: 0 },
        });
      });

      await waitFor(() => {
        expect(result.current.quizState).toBe(QuizState.BRIEFING);
      });

      await act(async () => {
        result.current.handleStartQuiz();
      });

      await waitFor(() => {
        expect(result.current.quizState).toBe(QuizState.ACTIVE);
        expect(result.current.isQuizActive).toBe(true);
      });
    });

    it('should handle generation error correctly', async () => {
      vi.mocked(clientDb.getCourseTopicsWithCounts).mockResolvedValue([
        {
          name: 'Topic 1',
          isCompleted: false,
          counts: { antrenman: 0, arsiv: 0, deneme: 0, total: 10 },
        },
      ]);
      vi.mocked(clientDb.getTopicCompletionStatus).mockResolvedValue({
        completed: false,
        antrenman: { solved: 0, total: 0, quota: 10, existing: 0 },
        deneme: { solved: 0, total: 0, quota: 0, existing: 0 },
        arsiv: { solved: 0, total: 0, quota: 0, existing: 0, srsDueCount: 0 },
        mistakes: { solved: 0, total: 0, existing: 0 },
        aiLogic: { suggested_quotas: { antrenman: 0, arsiv: 0, deneme: 0 } },
        concepts: [
          {
            baslik: 'Concept 1',
            odak: '',
            seviye: 'Bilgi',
            gorsel: '',
          },
        ],
      });
      vi.mocked(clientDb.getFirstChunkIdForTopic).mockResolvedValue('chunk-1');

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: true,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await waitFor(() => {
        expect(result.current.topics).toHaveLength(1);
      });

      await act(async () => {
        result.current.setSelectedTopic(result.current.topics[0]);
      });

      const factoryModule = await import('@/features/quiz/lib/ai/factory');
      const mockGenerate = (factoryModule as Record<string, unknown>)
        .mockGenerate as ReturnType<typeof vi.fn>;
      vi.mocked(mockGenerate).mockImplementationOnce(
        (
          _chunkId: string,
          callbacks?: { onError?: (error: string) => void }
        ) => {
          if (callbacks?.onError) callbacks.onError('Error');
          return Promise.resolve();
        }
      );

      await act(async () => {
        result.current.handleStartQuiz();
      });

      expect(result.current.isGeneratingExam).toBe(false);
    });

    it('should handle resetState correctly', async () => {
      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: true,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await act(async () => {
        result.current.setSelectedTopic({
          name: 'Topic',
          isCompleted: false,
          counts: { antrenman: 0, arsiv: 0, deneme: 0, total: 0 },
        });
        (result.current as { resetState: () => void }).resetState();
      });

      expect(result.current.selectedTopic).toBeNull();
      expect(result.current.isQuizActive).toBe(false);
    });
  });

  describe('Smart Exam (Pool Bypass)', () => {
    it('should skip generation and go to ACTIVE if pool has > 20 questions', async () => {
      vi.mocked(ExamService.fetchSmartExamFromPool).mockResolvedValue({
        success: true,
        questionIds: Array.from({ length: 25 }, (_, i) => `q${i}`),
      });

      mockRepository.fetchQuestionsByIds.mockResolvedValue(
        Array.from(
          { length: 25 },
          (_, i) =>
            ({
              id: `q${i}`,
              question_data: {
                type: 'multiple_choice',
                q: 'test',
                o: [],
                a: 0,
                exp: 'explanation',
              },
            }) as Record<string, unknown>
        )
      );

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: true,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await act(async () => {
        await result.current.handleStartSmartExam();
      });

      expect(result.current.isQuizActive).toBe(true);
      expect(result.current.existingQuestions).toHaveLength(25);
    });

    it('should Fallback to generation if pool has < 20 questions', async () => {
      vi.mocked(ExamService.fetchSmartExamFromPool).mockResolvedValue({
        success: true,
        questionIds: ['q1', 'q2'],
      });

      vi.mocked(ExamService.generateSmartExam).mockResolvedValue({
        success: true,
        questionIds: ['q3'],
      });

      mockRepository.fetchQuestionsByIds.mockResolvedValue([
        {
          id: 'q3',
          question_data: {
            type: 'multiple_choice',
            q: 'test',
            o: [],
            a: 0,
            exp: 'explanation',
          },
        },
      ]);

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: true,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await act(async () => {
        await result.current.handleStartSmartExam();
      });

      expect(ExamService.generateSmartExam).toHaveBeenCalled();
      expect(result.current.isQuizActive).toBe(true);
    });

    it('should handle handleStartSmartExam error', async () => {
      vi.mocked(ExamService.fetchSmartExamFromPool).mockResolvedValue({
        success: true,
        questionIds: [],
      });
      vi.mocked(ExamService.generateSmartExam).mockRejectedValue(
        new Error('Pool Error')
      );

      const { result } = renderHook(() =>
        useQuizManager({
          isOpen: true,
          courseId: mockCourseId,
          courseName: mockCourseName,
        })
      );

      await act(async () => {
        await result.current.handleStartSmartExam();
      });

      expect(result.current.isGeneratingExam).toBe(false);
    });
  });
});
