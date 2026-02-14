/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createQuestion,
  createQuestions,
  fetchCachedQuestion,
  fetchCourseChunks,
  fetchCourseMastery,
  fetchGeneratedQuestions,
  fetchNewFollowups,
  fetchPrerequisiteQuestions,
  fetchQuestionsByIds,
  fetchQuestionsByStatus,
  fetchWaterfallTrainingQuestions,
  finishQuizSession,
  getAntrenmanQuestionCount,
  getArchivedQuestionsCount,
  getChunkMastery,
  getChunkMetadata,
  getChunkQuestionCount,
  getChunkQuotaStatus,
  getChunkWithContent,
  getContentVersion,
  getCourseStats,
  getCourseStatsAggregate,
  getCurrentSessionToken,
  getFrontierChunkId,
  getQuestionData,
  getQuotaInfo,
  getRecentDiagnoses,
  getSessionInfo,
  getSolvedQuestionIds,
  getTotalQuestionsInCourse,
  getUniqueSolvedCountInChunk,
  incrementCourseSession,
  recordQuizProgress,
  updateChunkMetadata,
  updateChunkStatus,
  upsertChunkMastery,
  upsertUserQuestionStatus,
} from '@/features/quiz/api/repository';
import { supabase } from '@/shared/lib/core/supabase';
import { addToOfflineQueue } from '@/shared/lib/core/services/offline-queue.service';

// Mock Supabase client
vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock OfflineQueue service
vi.mock('@/shared/lib/core/services/offline-queue.service', () => ({
  addToOfflineQueue: vi.fn(),
}));

// Mock storage service
vi.mock('@/shared/lib/core/services/storage.service', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

interface MockResponseData {
  data: unknown;
  error: unknown;
  count?: number;
}

interface MockChain {
  [key: string]: ReturnType<typeof vi.fn>;
}

describe('Repository & Persistence Data Integrity Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Helper to create a fluent mock chain ---

  const createSupabaseMock = (responseData?: MockResponseData): any => {
    const chain: MockChain = {};

    const fluentMethods = [
      'select',
      'insert',
      'update',
      'upsert',
      'delete',
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'in',
      'is',
      'like',
      'ilike',
      'limit',
      'order',
      'range',
      'match',
      'not',
      'or',
      'contains',
    ];

    fluentMethods.forEach((method) => {
      chain[method] = vi.fn().mockImplementation(() => chain);
    });

    const terminatorMethods = ['single', 'maybeSingle'];
    terminatorMethods.forEach((method) => {
      chain[method] = vi.fn().mockImplementation(async () => ({
        data: responseData?.data ?? null,
        error: responseData?.error ?? null,
        count: responseData?.count ?? 0,
      }));
    });

    chain.then = vi
      .fn()
      .mockImplementation(
        (onFulfilled: (value: MockResponseData) => unknown) => {
          return Promise.resolve({
            data: responseData?.data ?? null,
            error: responseData?.error ?? null,
            count: responseData?.count ?? 0,
          }).then(onFulfilled);
        }
      );

    return chain;
  };

  describe('Session Counter (RPC & Graceful Failures)', () => {
    it('should call rpc increment_course_session with correct params', async () => {
      const mockRpc = vi.mocked(supabase.rpc).mockResolvedValue({
        data: { current_session: 5, is_new_session: false },
        error: null,
      } as any);

      const userId = 'user-123';
      const courseId = 'course-456';

      const result = await incrementCourseSession(userId, courseId);

      expect(mockRpc).toHaveBeenCalledWith('increment_course_session', {
        p_user_id: userId,
        p_course_id: courseId,
      });
      expect(result.data).toEqual({
        current_session: 5,
        is_new_session: false,
      });
    });

    it('should handle RPC failures gracefully (increment_course_session)', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Server Error', code: '500' },
      } as any);

      const result = await incrementCourseSession('u1', 'c1');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Server Error');
    });
  });

  describe('Mapping Logic (Snake vs Camel)', () => {
    it('should transform getCourseStats snake_case DB fields to camelCase', async () => {
      const mockChain = createSupabaseMock({
        data: [
          { total_questions_seen: 10, mastery_score: 80 },
          { total_questions_seen: 20, mastery_score: 90 },
        ],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const stats = await getCourseStats('u1', 'c1');

      expect(stats).toEqual({
        totalQuestionsSolved: 30,
        averageMastery: 85,
      });
    });

    it('should transform getSessionInfo fields correctly', async () => {
      const mockChain = createSupabaseMock({
        data: { current_session: 12 },
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const session = await getSessionInfo('u1', 'c1');
      expect(session.currentSession).toBe(12);
      expect(session.courseId).toBe('c1');
    });

    it('should transform getChunkQuotaStatus fields to camelCase', async () => {
      const mockChain = createSupabaseMock({
        data: {
          id: 'chunk1',
          status: 'COMPLETED',
          metadata: { difficulty_index: 4 },
          ai_logic: { suggested_quotas: { antrenman: 10 } },
        },
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      // We also need to mock getAntrenmanQuestionCount which is called inside
      // It calls supabase.from('questions').select('*', { count: 'exact', head: true }).eq('chunk_id', chunkId).eq('usage_type', 'antrenman')
      // and returns count.
      // Since it's an internal call, we need to handle multiple from() calls.

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'note_chunks') return mockChain;
        if (table === 'questions') {
          return createSupabaseMock({ data: null, error: null, count: 3 });
        }
        return createSupabaseMock();
      });

      const status = await getChunkQuotaStatus('chunk1');
      expect(status?.difficultyIndex).toBe(4);
      expect(status?.isFull).toBe(false); // 3 < 10
      expect(status?.quota.total).toBe(10);
    });
  });

  describe('recordQuizProgress (Save Quest Progress & Offline Resilience)', () => {
    const payload = {
      user_id: 'u1',
      question_id: 'q1',
      chunk_id: 'c1',
      course_id: 'crs1',
      is_correct: true,
      time_spent_ms: 5000,
      response_type: 'correct' as const,
      session_number: 1,
    };

    it('should record progress successfully', async () => {
      const mockChain = createSupabaseMock({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await recordQuizProgress(payload);
      expect(result.success).toBe(true);
      expect(mockChain.insert).toHaveBeenCalledWith(payload);
    });

    it('should handle network errors by calling addToOfflineQueue', async () => {
      const mockChain = createSupabaseMock({
        data: null,
        error: { message: 'Network Request Failed', code: 'NETWORK_ERROR' },
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await recordQuizProgress(payload);
      expect(result.success).toBe(false);
      expect(addToOfflineQueue).toHaveBeenCalledWith(payload);
      expect(result.error?.message).toBe('Network Request Failed');
    });

    it('should handle timeouts by calling addToOfflineQueue', async () => {
      const mockChain = createSupabaseMock({
        data: null,
        error: { message: 'timeout', code: 'TIMEOUT' },
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await recordQuizProgress(payload);
      expect(result.success).toBe(false);
      expect(addToOfflineQueue).toHaveBeenCalledWith(payload);
    });
  });

  describe('SRS Data Persistence (upsertUserQuestionStatus)', () => {
    it('should verify SRS payload fields and onConflict', async () => {
      const mockChain = createSupabaseMock({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const payload = {
        user_id: 'u1',
        question_id: 'q1',
        status: 'active' as const,
        consecutive_success: 5,
        next_review_session: 20,
      };

      await upsertUserQuestionStatus(payload);

      expect(supabase.from).toHaveBeenCalledWith('user_question_status');
      expect(mockChain.upsert).toHaveBeenCalledWith(payload, {
        onConflict: 'user_id,question_id',
      });
    });
  });

  describe('Batching (createQuestions)', () => {
    it('should handle batch insert of 100+ items successfully', async () => {
      const payloads = Array.from({ length: 110 }, (_, i) => ({
        chunk_id: 'c1',
        question_data: { text: `Q${i}` },
        course_id: 'crs1',
        section_title: 'Test Section',
      }));

      const mockData = payloads.map((p, i) => ({ id: `uuid-${i}` }));
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await createQuestions(payloads);
      expect(result.success).toBe(true);
      expect(result.ids).toHaveLength(110);
      expect(mockChain.insert).toHaveBeenCalledWith(payloads);
    });

    it('should handle partial failures in batch insert', async () => {
      const payloads = [
        {
          chunk_id: 'c1',
          course_id: 'crs1',
          question_data: { text: 'Q1' },
          section_title: 'Test',
        },
      ];
      const mockChain = createSupabaseMock({
        data: null,
        error: { message: 'Batch Insert Failed' },
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await createQuestions(payloads);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Batch Insert Failed');
    });
  });

  describe('Fetch Waterfall & Complex Logic', () => {
    it('should handle fetchWaterfallTrainingQuestions successfully', async () => {
      // Phase 1: Target Chunk
      const targetChunkData = [
        {
          question_id: 'q1',
          status: 'active' as const,
          next_review_session: null,
          questions: {
            id: 'q1',
            chunk_id: 'target',
            course_id: 'crs1',
            parent_question_id: null,
            question_data: {},
          },
        },
      ];

      const mockChain = createSupabaseMock({
        data: targetChunkData,
        error: null,
      });

      // Phase 2: Weak Chunks
      const weakChunksData = [{ chunk_id: 'weak1' }];
      const weakChain = createSupabaseMock({
        data: weakChunksData,
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_question_status') return mockChain;
        if (table === 'chunk_mastery') return weakChain;
        if (table === 'questions') {
          return createSupabaseMock({ data: [], error: null });
        }
        return createSupabaseMock();
      });

      const results = await fetchWaterfallTrainingQuestions(
        'u1',
        'c1',
        'target',
        1
      );
      expect(results).toHaveLength(1);
      expect(results[0].question_id).toBe('q1');
    });

    it('should handle getArchivedQuestionsCount', async () => {
      const mockChain = createSupabaseMock({
        data: null,
        error: null,
        count: 5,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const count = await getArchivedQuestionsCount('u1', 'c1');
      expect(count).toBe(5);
    });

    it('should handle getChunkQuestionCount', async () => {
      const mockChain = createSupabaseMock({
        data: null,
        error: null,
        count: 10,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const count = await getChunkQuestionCount('chunk1');
      expect(count).toBe(10);
    });

    it('should handle getTotalQuestionsInCourse', async () => {
      const mockChain = createSupabaseMock({
        data: null,
        error: null,
        count: 100,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const count = await getTotalQuestionsInCourse('course1');
      expect(count).toBe(100);
    });

    it('should handle getUniqueSolvedCountInChunk', async () => {
      const mockChain = createSupabaseMock({
        data: null,
        error: null,
        count: 7,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const count = await getUniqueSolvedCountInChunk('u1', 'c1');
      expect(count).toBe(7);
    });

    it('should handle getRecentDiagnoses', async () => {
      const mockData = [{ ai_diagnosis: 'D1' }, { ai_diagnosis: 'D2' }];
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await getRecentDiagnoses('u1', 'c1', 5);
      expect(result).toEqual(['D1', 'D2']);
    });

    it('should handle getCourseStatsAggregate', async () => {
      const mockData = [{ total_questions_seen: 5 }];
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await getCourseStatsAggregate('u1', 'c1');
      expect(result).toHaveLength(1);
    });

    it('should handle getAntrenmanQuestionCount', async () => {
      const mockChain = createSupabaseMock({
        data: null,
        error: null,
        count: 3,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const count = await getAntrenmanQuestionCount('c1');
      expect(count).toBe(3);
    });

    it('should handle getCurrentSessionToken', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'token123' } },
        error: null,
      } as any);
      const token = await getCurrentSessionToken();
      expect(token).toBe('token123');
    });

    it('should handle fetchNewFollowups', async () => {
      const mockData = [
        {
          id: 'q1',
          chunk_id: 'c1',
          course_id: 'crs1',
          parent_question_id: 'p1',
          question_data: {},
          user_question_status: [],
        },
      ];
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await fetchNewFollowups('crs1', 10);
      expect(result).toHaveLength(1);
    });

    it('should handle fetchQuestionsByIds', async () => {
      const mockData = [{ id: 'q1', chunk_id: 'c1' }];
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await fetchQuestionsByIds(['q1']);
      expect(result).toHaveLength(1);
      expect(mockChain.in).toHaveBeenCalledWith('id', ['q1']);
    });

    it('should handle getChunkMetadata', async () => {
      const mockData = {
        course_id: 'crs1',
        metadata: {},
        status: 'COMPLETED',
        content: '...',
      };
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await getChunkMetadata('chunk1');
      expect(result).toEqual(mockData);
    });
  });

  describe('Utility Data Fetching', () => {
    it('should handle fetchCourseMastery', async () => {
      const mockData = [{ chunk_id: 'c1', mastery_score: 50 }];
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await fetchCourseMastery('crs1', 'u1');
      expect(result).toHaveLength(1);
    });

    it('should handle fetchPrerequisiteQuestions', async () => {
      const mockData = [{ id: 'q1' }];
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await fetchPrerequisiteQuestions('crs1', ['conc1'], 5);
      expect(result).toHaveLength(1);
    });

    it('should handle fetchGeneratedQuestions', async () => {
      const mockData = [{ id: 'q1' }];
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await fetchGeneratedQuestions('c1', 'antrenman', 5);
      expect(result).toHaveLength(1);
    });

    it('should handle getChunkWithContent', async () => {
      const mockData = {
        id: 'c1',
        course_id: 'crs1',
        metadata: {},
        status: 'DONE',
        content: '...',
        display_content: null,
        course_name: null,
        section_title: null,
      };
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await getChunkWithContent('c1');
      expect(result?.id).toBe('c1');
    });

    it('should handle fetchCachedQuestion', async () => {
      const mockData = { id: 'q1' };
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await fetchCachedQuestion('c1', 'antrenman', 'Conc1');
      expect(result?.id).toBe('q1');
    });

    it('should handle getContentVersion', async () => {
      const date = new Date().toISOString();
      const mockChain = createSupabaseMock({
        data: { created_at: date },
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await getContentVersion('course1');
      expect(result).toBe(date);
    });

    it('should handle getQuotaInfo', async () => {
      const result = await getQuotaInfo('u1', 'c1', 1);
      expect(result.dailyQuota).toBeDefined();
    });

    it('should handle getSolvedQuestionIds', async () => {
      const mockData = [{ question_id: 'q1' }, { question_id: 'q2' }];
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await getSolvedQuestionIds('u1', 'c1');
      expect(result.has('q1')).toBe(true);
      expect(result.size).toBe(2);
    });

    it('should handle updateChunkStatus', async () => {
      const mockChain = createSupabaseMock({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await updateChunkStatus('c1', 'COMPLETED');
      expect(result.success).toBe(true);
      expect(mockChain.update).toHaveBeenCalledWith({ status: 'COMPLETED' });
    });

    it('should handle getChunkMastery', async () => {
      const mockData = {
        chunk_id: 'c1',
        mastery_score: 80,
        last_full_review_at: null,
        total_questions_seen: 10,
      };
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await getChunkMastery('u1', 'c1');
      expect(result?.mastery_score).toBe(80);
    });

    it('should handle createQuestion', async () => {
      const mockChain = createSupabaseMock({
        data: { id: 'new-q' },
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await createQuestion({
        chunk_id: 'c1',
        course_id: 'crs1',
        question_data: { text: 'Q1' },
        section_title: 'Test',
      });
      expect(result.success).toBe(true);
      expect(result.id).toBe('new-q');
    });

    it('should handle getQuestionData', async () => {
      const mockData = { id: 'q1', question_data: {} };
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await getQuestionData('q1');
      expect(result?.id).toBe('q1');
    });

    it('should handle upsertChunkMastery', async () => {
      const mockChain = createSupabaseMock({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await upsertChunkMastery({
        chunk_id: 'c1',
        course_id: 'crs1',
        user_id: 'u1',
        mastery_score: 90,
      });
      expect(result.success).toBe(true);
    });

    it('should handle getFrontierChunkId', async () => {
      const mockChain = createSupabaseMock({
        data: { chunk_id: 'c2' },
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await getFrontierChunkId('u1', 'c1');
      expect(result).toBe('c2');
    });

    it('should handle fetchCourseChunks', async () => {
      const mockData = [{ id: 'c1' }];
      const mockChain = createSupabaseMock({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await fetchCourseChunks('crs1');
      expect(result).toHaveLength(1);
    });

    it('should handle updateChunkMetadata', async () => {
      const mockChain = createSupabaseMock({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await updateChunkMetadata('c1', { key: 'val' });
      expect(result.success).toBe(true);
    });

    it('should handle createQuestion failure', async () => {
      const mockChain = createSupabaseMock({
        data: null,
        error: { message: 'Insert Error' },
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await createQuestion({
        chunk_id: 'c1',
        course_id: 'crs1',
        question_data: { text: 'Q1' },
        section_title: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Insert Error');
    });

    it('should handle updateChunkStatus failure', async () => {
      const mockChain = createSupabaseMock({
        data: null,
        error: { message: 'Update Error' },
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await updateChunkStatus('c1', 'COMPLETED');
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Update Error');
    });

    it('should handle updateChunkMetadata failure', async () => {
      const mockChain = createSupabaseMock({
        data: null,
        error: { message: 'Metadata Error' },
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await updateChunkMetadata('c1', {});
      expect(result.success).toBe(false);
    });

    it('should return null for non-existent question data', async () => {
      const mockChain = createSupabaseMock({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await getQuestionData('none');
      expect(result).toBeNull();
    });

    it('should return null for non-existent chunk content', async () => {
      const mockChain = createSupabaseMock({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await getChunkWithContent('none');
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases & Remaining Coverage', () => {
    it('should handle empty question array in fetchQuestionsByStatus', async () => {
      const mockChain = createSupabaseMock({ data: [], error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain);
      const result = await fetchQuestionsByStatus(
        'u1',
        'c1',
        'active',
        null,
        10
      );
      expect(result).toEqual([]);
    });

    it('should handle finishQuizSession correctly', async () => {
      const mockChain = createSupabaseMock({ data: null, error: null });
      vi.mocked(supabase.from).mockImplementation(() => mockChain);

      const result = await finishQuizSession({
        userId: 'u1',
        courseId: 'c1',
        correctCount: 5,
        incorrectCount: 1,
        blankCount: 0,
        timeSpentMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(mockChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'u1', course_id: 'c1' }),
        { onConflict: 'user_id,course_id' }
      );
    });

    it('should handle finishQuizSession failure', async () => {
      const mockChain = createSupabaseMock({
        data: null,
        error: { message: 'Upsert Failed' },
      });
      vi.mocked(supabase.from).mockImplementation(() => mockChain);

      const result = await finishQuizSession({
        userId: 'u1',
        courseId: 'c1',
        correctCount: 5,
        incorrectCount: 1,
        blankCount: 0,
        timeSpentMs: 1000,
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Upsert Failed');
    });
  });
});
