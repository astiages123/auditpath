import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuiz } from '@/features/quiz/hooks/use-quiz';
import * as Repository from '@/features/quiz/api/repository';
import * as Engine from '@/features/quiz/core/engine';
import { QuizQuestion } from '@/features/quiz/core/types';
import { QuizFactory } from '@/features/quiz/core/factory';
import { logger } from '@/shared/lib/core/utils/logger';

// Mock Repository
vi.mock('@/features/quiz/api/repository', () => ({
  incrementCourseSession: vi.fn(),
  getCourseName: vi.fn(),
  getChunkMetadata: vi.fn(),
  fetchQuestionsByChunk: vi.fn(),
  getUserQuestionStatus: vi.fn(),
  upsertUserQuestionStatus: vi.fn(),
  recordQuizProgress: vi.fn(),
  getChunkMastery: vi.fn(),
  getChunkQuestionCount: vi.fn(),
  getUniqueSolvedCountInChunk: vi.fn(),
  upsertChunkMastery: vi.fn(),
  getQuestionData: vi.fn(),
  getAttemptCount: vi.fn(),
  fetchQuestionsByIds: vi.fn(),
  getChunkWithContent: vi.fn(),
  fetchQuestionsByStatus: vi.fn(),
  fetchNewFollowups: vi.fn(),
  fetchWaterfallTrainingQuestions: vi.fn(),
  getFrontierChunkId: vi.fn(),
  fetchCourseChunks: vi.fn(),
  fetchPrerequisiteQuestions: vi.fn(),
  fetchCourseMastery: vi.fn(),
  fetchGeneratedQuestions: vi.fn(),
}));

// Mock QuizFactory
vi.mock('@/features/quiz/core/factory', () => {
  return {
    QuizFactory: vi.fn().mockImplementation(function (this: {
      generateForChunk: ReturnType<typeof vi.fn>;
      generateFollowUp: ReturnType<typeof vi.fn>;
      generateArchiveRefresh: ReturnType<typeof vi.fn>;
    }) {
      this.generateForChunk = vi.fn().mockResolvedValue(undefined);
      this.generateFollowUp = vi.fn().mockResolvedValue('new-followup-id');
      this.generateArchiveRefresh = vi.fn().mockResolvedValue('new-archive-id');
    }),
  };
});

// Mock Logger
vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Stub Global Crypto
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid',
});

// Mock Engine? No, we want to test Engine integration, so we keep Engine real.
// But Engine calls Repository. So mocking Repository is enough.
// We also need to mock Utils if they use timers or complex things?
// useQuiz uses `createTimer`. `createTimer` is likely simple.

describe('QuizEngine Integration (via useQuiz)', () => {
  const mockUserId = 'user-123';
  const mockCourseId = 'course-abc';
  const mockChunkId = 'chunk-xyz';
  const mockCourseName = 'Test Course';

  const mockQuestions: QuizQuestion[] = [
    {
      id: 'q1',
      type: 'multiple_choice',
      q: 'Question 1',
      o: ['A', 'B', 'C', 'D', 'E'],
      a: 0,
      exp: 'Explanation 1',
      chunk_id: mockChunkId,
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      q: 'Question 2',
      o: ['A', 'B', 'C', 'D', 'E'],
      a: 1,
      exp: 'Explanation 2',
      chunk_id: mockChunkId,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default Repository mocks
    vi.mocked(Repository.incrementCourseSession).mockResolvedValue({
      data: { current_session: 1, is_new_session: true },
      error: null,
    } as {
      data: { current_session: number; is_new_session: boolean } | null;
      error: Error | null;
    });
    vi.mocked(Repository.getCourseName).mockResolvedValue(mockCourseName);
    vi.mocked(Repository.getChunkMetadata).mockResolvedValue({
      course_id: mockCourseId,
      metadata: {
        concept_map: [
          { baslik: 'C1', odak: 'F1', seviye: 'Bilgi', gorsel: null },
        ],
      },
      content: 'Test content with long enough text for calculation.',
      status: 'COMPLETED',
    });

    vi.mocked(Repository.getFrontierChunkId).mockResolvedValue(mockChunkId);
    vi.mocked(Repository.fetchWaterfallTrainingQuestions).mockResolvedValue([
      {
        question_id: 'q1',
        status: 'active' as const,
        next_review_session: null,
        questions: {
          id: 'q1',
          chunk_id: mockChunkId,
          course_id: mockCourseId,
          parent_question_id: null,
          question_data: {
            type: 'multiple_choice',
            q: 'Q1',
            o: ['A'],
            a: 0,
            exp: 'E1',
          },
        },
      },
      {
        question_id: 'q2',
        status: 'active' as const,
        next_review_session: null,
        questions: {
          id: 'q2',
          chunk_id: mockChunkId,
          course_id: mockCourseId,
          parent_question_id: null,
          question_data: {
            type: 'multiple_choice',
            q: 'Q2',
            o: ['A'],
            a: 0,
            exp: 'E2',
          },
        },
      },
    ]);

    vi.mocked(Repository.fetchQuestionsByIds).mockResolvedValue([
      {
        id: 'q1',
        chunk_id: mockChunkId,
        question_data: {
          type: 'multiple_choice',
          q: 'Question 1',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Explanation 1',
        },
        bloom_level: 'knowledge',
        concept_title: 'Test Concept',
      },
      {
        id: 'q2',
        chunk_id: mockChunkId,
        question_data: {
          type: 'multiple_choice',
          q: 'Question 2',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 1,
          exp: 'Explanation 2',
        },
        bloom_level: 'knowledge',
        concept_title: 'Test Concept',
      },
    ]);

    // Engine.submitAnswer needs these
    vi.mocked(Repository.getUserQuestionStatus).mockResolvedValue(null);
    vi.mocked(Repository.getQuestionData).mockResolvedValue({
      id: 'q1',
      chunk_id: mockChunkId,
      question_data: {
        type: 'multiple_choice',
        q: 'Question 1',
        o: ['A', 'B', 'C', 'D', 'E'],
        a: 0,
        exp: 'Explanation 1',
      },
      bloom_level: 'knowledge' as const,
      concept_title: 'Test Concept',
    });
    vi.mocked(Repository.getChunkMastery).mockResolvedValue({
      chunk_id: mockChunkId,
      mastery_score: 50,
      last_full_review_at: null,
      total_questions_seen: 5,
    });
    vi.mocked(Repository.getChunkQuestionCount).mockResolvedValue(10);
    vi.mocked(Repository.getUniqueSolvedCountInChunk).mockResolvedValue(5);
    vi.mocked(Repository.fetchQuestionsByStatus).mockResolvedValue([]);
    vi.mocked(Repository.fetchNewFollowups).mockResolvedValue([]);
  });

  describe('Session Initialization', () => {
    it('should initialize session and load questions', async () => {
      const { result } = renderHook(() => useQuiz());

      // Start Logic
      // generateBatch triggers startSession and fetchQuestions
      await act(async () => {
        await result.current.generateBatch(5, {
          type: 'chunk',
          chunkId: mockChunkId,
          userId: mockUserId,
        });
      });

      expect(Repository.incrementCourseSession).toHaveBeenCalledWith(
        mockUserId,
        mockCourseId
      );
      expect(Repository.fetchQuestionsByIds).toHaveBeenCalled();

      expect(result.current.state.currentQuestion).toEqual(mockQuestions[0]);
      expect(result.current.state.queue).toHaveLength(1); // q2 remains
      expect(result.current.state.totalToGenerate).toBe(2);
      expect(result.current.results.totalTimeMs).toBe(0);
    });
  });

  describe('State Transition (Correct Answer)', () => {
    it('should update results and call Engine.submitAnswer on correct answer', async () => {
      const { result } = renderHook(() => useQuiz());

      // Init
      await act(async () => {
        await result.current.generateBatch(5, {
          type: 'chunk',
          chunkId: mockChunkId,
          userId: mockUserId,
        });
      });

      // Start Timer
      act(() => {
        result.current.startQuiz();
      });

      // Advance time slightly to test timing
      // const timeSpent = 1000;
      // vi.advanceTimersByTime && vi.advanceTimersByTime(timeSpent);
      // Removed to avoid error. Timing verified in separate test.

      // Answer Correctly (Index 0 is correct for q1)
      await act(async () => {
        await result.current.selectAnswer(0);
      });

      // Verify UI State
      expect(result.current.state.isCorrect).toBe(true);
      expect(result.current.state.selectedAnswer).toBe(0);
      expect(result.current.results.correct).toBe(1);

      // Verify Engine/Repository calls
      expect(Repository.upsertUserQuestionStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending_followup', // SRS logic dependent
          consecutive_success: 1, // First success
        })
      );

      // Verify Mastery Update (Engine -> Repository)
      expect(Repository.upsertChunkMastery).toHaveBeenCalled();
    });
  });

  describe('State Transition (Incorrect Answer)', () => {
    it('should handle incorrect answer and queue logic', async () => {
      const { result } = renderHook(() => useQuiz());

      await act(async () => {
        await result.current.generateBatch(2, {
          type: 'chunk',
          chunkId: mockChunkId,
          userId: mockUserId,
        });
      });

      act(() => {
        result.current.startQuiz();
      });

      // Answer Incorrectly (Index 1 is wrong for q1)
      await act(async () => {
        await result.current.selectAnswer(1);
      });

      expect(result.current.state.isCorrect).toBe(false);
      expect(result.current.results.incorrect).toBe(1);

      // SRS logic: failing usually resets consec success
      expect(Repository.upsertUserQuestionStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          consecutive_success: 0,
        })
      );
    });
  });

  describe('Intermission & Finish Logic', () => {
    it('should calculate results when all questions are answered', async () => {
      const { result } = renderHook(() => useQuiz());

      await act(async () => {
        await result.current.generateBatch(2, {
          type: 'chunk',
          chunkId: mockChunkId,
          userId: mockUserId,
        });
      });
      act(() => {
        result.current.startQuiz();
      });

      // Q1: Correct
      await act(async () => {
        await result.current.selectAnswer(0);
      });
      await act(async () => {
        await result.current.nextQuestion(mockUserId, mockCourseId);
      });

      // Q2: Incorrect (Index 0 is wrong for q2, a=1)
      await act(async () => {
        await result.current.selectAnswer(0);
      });
      await act(async () => {
        await result.current.nextQuestion(mockUserId, mockCourseId);
      });

      // Now queue should be empty, nextQuestion called again triggers finish?
      // Wait, `nextQuestion` checks `queue.length > 0`.
      // If empty, it triggers finish.
      // We called `nextQuestion` AFTER Q2. Q2 was the last one.
      // `nextQuestion` logic:
      // shift q1 -> current=q2, queue=[]
      // answer q2
      // call nextQuestion -> queue empty -> Finish

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.summary).not.toBeNull();
      expect(result.current.state.summary?.percentage).toBe(50); // 1/2 correct
      expect(result.current.state.summary?.pendingReview).toBe(1); // 1 incorrect
    });
  });

  describe('Timing Accuracy', () => {
    it('should accumulate time spent', async () => {
      // Need to mock performance.now or Date.now
      // Vitest fake timers might override Date.now
      vi.useFakeTimers();

      const { result } = renderHook(() => useQuiz());
      await act(async () => {
        await result.current.generateBatch(1, {
          type: 'chunk',
          chunkId: mockChunkId,
          userId: mockUserId,
        });
      });
      act(() => {
        result.current.startQuiz();
      });

      // Advance 1000ms
      vi.advanceTimersByTime(1000);

      await act(async () => {
        await result.current.selectAnswer(0);
      });

      expect(result.current.results.totalTimeMs).toBeGreaterThanOrEqual(1000);

      vi.useRealTimers();
    });
  });
  describe('Session & Interaction Unit Tests', () => {
    it('should throw error when startSession fails', async () => {
      vi.mocked(Repository.incrementCourseSession).mockResolvedValue({
        data: null,
        error: new Error('DB Error'),
      } as { data: null; error: Error });

      await expect(
        Engine.startSession(mockUserId, mockCourseId)
      ).rejects.toThrow('DB Error');
    });

    it('should correctly transfer calculated results in submitAnswer', async () => {
      vi.mocked(Repository.getUserQuestionStatus).mockResolvedValue(null); // Reset to null for clearer logic
      vi.mocked(Repository.getQuestionData).mockResolvedValue({
        id: 'q1',
        chunk_id: mockChunkId,
        question_data: {
          type: 'multiple_choice',
          q: 'Q1',
          o: ['A'],
          a: 0,
          exp: 'E',
        },
        bloom_level: 'knowledge' as const,
        concept_title: 'Test Concept',
      });
      vi.mocked(Repository.getChunkMetadata).mockResolvedValue({
        course_id: mockCourseId,
        metadata: { concept_map: [], difficulty_index: 3 },
        content: 'Long content to avoid short text penalties in mastery',
        status: 'COMPLETED' as const,
      });

      await Engine.submitAnswer(
        {
          userId: mockUserId,
          courseId: mockCourseId,
          sessionNumber: 5,
          isNewSession: false,
        },
        'q1',
        mockChunkId,
        'correct',
        1000,
        0
      );

      expect(Repository.upsertUserQuestionStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          question_id: 'q1',
          status: 'pending_followup', // Result of logic for 'correct' from null status
        })
      );

      expect(Repository.recordQuizProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          response_type: 'correct',
          time_spent_ms: 1000,
        })
      );
    });
  });

  describe('ExamService Unit Tests', () => {
    const callbacks = {
      onLog: vi.fn(),
      onQuestionSaved: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should generate smart exam when pool is insufficient', async () => {
      vi.mocked(Repository.fetchCourseChunks).mockResolvedValue([
        {
          id: 'c1',
          metadata: { concept_map: [], difficulty_index: 3 },
          content: 'Test content',
        },
      ]);
      vi.mocked(Repository.fetchCourseMastery).mockResolvedValue([]);
      vi.mocked(Repository.fetchGeneratedQuestions).mockResolvedValueOnce([]); // Empty pool
      vi.mocked(Repository.fetchGeneratedQuestions).mockResolvedValue([
        { id: 'g1' },
      ]); // Post-generation fetch

      const result = await Engine.ExamService.generateSmartExam(
        mockCourseId,
        mockCourseName,
        mockUserId,
        callbacks
      );

      expect(result.success).toBe(true);
      expect(QuizFactory).toHaveBeenCalled();
      const factoryInstance = vi.mocked(QuizFactory).mock.results[0].value;
      expect(factoryInstance.generateForChunk).toHaveBeenCalledWith(
        'c1',
        expect.anything(),
        expect.objectContaining({ targetCount: 20 })
      );
      expect(callbacks.onComplete).toHaveBeenCalled();
    });

    it('should NOT call factory when pool is sufficient', async () => {
      vi.mocked(Repository.fetchCourseChunks).mockResolvedValue([
        {
          id: 'c1',
          metadata: { concept_map: [], difficulty_index: 3 },
          content: 'Test content',
        },
      ]);
      vi.mocked(Repository.fetchCourseMastery).mockResolvedValue([]);
      vi.mocked(Repository.fetchGeneratedQuestions).mockResolvedValue(
        Array(20).fill({ id: 'existing' })
      );

      await Engine.ExamService.generateSmartExam(
        mockCourseId,
        mockCourseName,
        mockUserId,
        callbacks
      );

      const factoryInstance = vi.mocked(QuizFactory).mock.results[0].value;
      expect(factoryInstance.generateForChunk).not.toHaveBeenCalled();
    });

    it('should handle factory errors via callbacks.onError', async () => {
      vi.mocked(Repository.fetchCourseChunks).mockResolvedValue([
        {
          id: 'c1',
          metadata: { concept_map: [], difficulty_index: 3 },
          content: 'Test content',
        },
      ]);
      vi.mocked(Repository.fetchGeneratedQuestions).mockResolvedValueOnce([]);

      // Mock factory to throw
      vi.mocked(QuizFactory).mockImplementationOnce(function (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this: any
      ) {
        this.generateForChunk = vi
          .fn()
          .mockRejectedValue(new Error('Gen Failed'));
      });

      await Engine.ExamService.generateSmartExam(
        mockCourseId,
        mockCourseName,
        mockUserId,
        callbacks
      );

      expect(callbacks.onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('fetchSmartExamFromPool should return null if pool insufficient', async () => {
      vi.mocked(Repository.fetchCourseChunks).mockResolvedValue([
        {
          id: 'c1',
          metadata: { concept_map: [], difficulty_index: 3 },
          content: 'Test content',
        },
      ]);
      vi.mocked(Repository.fetchGeneratedQuestions).mockResolvedValue([]);

      const result = await Engine.ExamService.fetchSmartExamFromPool(
        mockCourseId,
        mockUserId
      );
      expect(result).toBeNull();
    });
  });

  describe('Review Queue & UI Helpers', () => {
    const ctx: Engine.SessionContext = {
      userId: mockUserId,
      courseId: mockCourseId,
      sessionNumber: 1,
      isNewSession: false,
    };

    it('getReviewQueue fallback to frontier when targetChunkId is null', async () => {
      vi.mocked(Repository.getFrontierChunkId).mockResolvedValue(
        'frontier-123'
      );
      vi.mocked(Repository.fetchWaterfallTrainingQuestions).mockResolvedValue(
        []
      );
      vi.mocked(Repository.fetchQuestionsByStatus).mockResolvedValue([]);

      await Engine.getReviewQueue(ctx, 20);

      expect(Repository.getFrontierChunkId).toHaveBeenCalledWith(
        mockUserId,
        mockCourseId
      );
      expect(Repository.fetchWaterfallTrainingQuestions).toHaveBeenCalledWith(
        mockUserId,
        mockCourseId,
        'frontier-123',
        14 // 70% of 20
      );
    });

    it('getReviewQueue Waterfall Fallback: should trigger generic search when waterfall is empty', async () => {
      vi.mocked(Repository.fetchWaterfallTrainingQuestions).mockResolvedValue(
        []
      ); // Waterfall empty
      vi.mocked(Repository.fetchQuestionsByStatus).mockResolvedValue([
        {
          question_id: 'fallback-q',
          status: 'active',
          next_review_session: null,
          questions: {
            id: 'q1',
            chunk_id: 'c1',
            course_id: mockCourseId,
            parent_question_id: null,
            question_data: {},
          },
        },
      ]);

      const queue = await Engine.getReviewQueue(ctx, 20, 'chunk-1');

      expect(Repository.fetchQuestionsByStatus).toHaveBeenCalledWith(
        mockUserId,
        mockCourseId,
        'active',
        null,
        17 // 4 (followup) + 14 (training) - 1 (found in followup) = 17
      );
      expect(queue.some((q) => q.questionId === 'fallback-q')).toBe(true);
    });

    it('processBatchForUI should trigger JIT refresh if pool is empty for archived items', async () => {
      vi.mocked(Repository.fetchGeneratedQuestions).mockResolvedValue([]); // Pool empty

      const items = [{ questionId: 'q-old', status: 'archived' }];
      const results = await Engine.processBatchForUI(items, 'chunk-1');

      expect(results[0]).toBe('new-archive-id'); // Result from QuizFactory.generateArchiveRefresh
    });

    it('checkAndTriggerBackgroundGeneration should log error on failure', async () => {
      vi.mocked(QuizFactory).mockImplementationOnce(function (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this: any
      ) {
        this.generateForChunk = vi.fn().mockRejectedValue(new Error('Bg Fail'));
      });

      await Engine.checkAndTriggerBackgroundGeneration('chunk-1', []);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to trigger background generation',
        expect.any(Error)
      );
    });
  });
});
