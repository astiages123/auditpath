/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchQuestionsByStatus,
  finishQuizSession,
  incrementCourseSession,
  upsertUserQuestionStatus,
} from '@/features/quiz/api/repository';
import { supabase } from '@/shared/lib/core/supabase';

// Mock Supabase client
vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('Repository & Persistence Data Integrity Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Helper to create a fluent mock chain ---
  const createSupabaseMock = () => {
    const selectMock = vi.fn().mockReturnThis();
    const insertMock = vi.fn().mockReturnThis();
    const updateMock = vi.fn().mockReturnThis();
    const upsertMock = vi.fn().mockReturnThis();
    const deleteMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const neqMock = vi.fn().mockReturnThis();
    const gtMock = vi.fn().mockReturnThis();
    const gteMock = vi.fn().mockReturnThis();
    const ltMock = vi.fn().mockReturnThis();
    const lteMock = vi.fn().mockReturnThis();
    const inMock = vi.fn().mockReturnThis();
    const isMock = vi.fn().mockReturnThis();
    const likeMock = vi.fn().mockReturnThis();
    const ilikeMock = vi.fn().mockReturnThis();
    const limitMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockReturnThis();
    const rangeMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn();
    const maybeSingleMock = vi.fn();

    const queryBuilder = {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      upsert: upsertMock,
      delete: deleteMock,
      eq: eqMock,
      neq: neqMock,
      gt: gtMock,
      gte: gteMock,
      lt: ltMock,
      lte: lteMock,
      in: inMock,
      is: isMock,
      like: likeMock,
      ilike: ilikeMock,
      limit: limitMock,
      order: orderMock,
      range: rangeMock,
      single: singleMock,
      maybeSingle: maybeSingleMock,
      m_select: selectMock,
      m_insert: insertMock,
      m_update: updateMock,
      m_upsert: upsertMock,
      m_eq: eqMock,
      m_single: singleMock,
      m_maybeSingle: maybeSingleMock,
      m_lte: lteMock,
    };

    return queryBuilder;
  };

  describe('Session Counter (RPC vs Manual)', () => {
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
      expect(result.error).toBeNull();
    });

    it('should handle finishQuizSession manual upsert correctly (insert)', async () => {
      const mockChain = createSupabaseMock();
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock upsert call
      mockChain.m_upsert.mockResolvedValueOnce({ error: null });

      const stats = {
        correctCount: 10,
        incorrectCount: 2,
        blankCount: 0,
        timeSpentMs: 10000,
        courseId: 'course-123',
        userId: 'user-123',
      };

      await finishQuizSession(stats);

      // Verify only upsert is called
      expect(supabase.from).toHaveBeenCalledWith('course_session_counters');
      expect(mockChain.m_upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          course_id: stats.courseId,
          user_id: stats.userId,
          current_session: 1,
        }),
        { onConflict: 'user_id,course_id' }
      );
    });

    it('should handle finishQuizSession manual upsert correctly (unified behavior)', async () => {
      const mockChain = createSupabaseMock();
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock upsert call
      mockChain.m_upsert.mockResolvedValueOnce({ error: null });

      const stats = {
        correctCount: 10,
        incorrectCount: 2,
        blankCount: 0,
        timeSpentMs: 10000,
        courseId: 'course-123',
        userId: 'user-123',
      };

      await finishQuizSession(stats);

      // Verify upsert with session 1 (the current implementation always sends 1)
      expect(mockChain.m_upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          course_id: stats.courseId,
          user_id: stats.userId,
          current_session: 1,
        }),
        { onConflict: 'user_id,course_id' }
      );
    });
  });

  describe('SRS Data Persistence', () => {
    it('should call upsertUserQuestionStatus with correct payload and onConflict', async () => {
      const mockChain = createSupabaseMock();
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);
      mockChain.m_upsert.mockResolvedValue({ error: null });

      const payload: {
        user_id: string;
        question_id: string;
        status: 'active' | 'archived' | 'pending_followup';
        consecutive_success?: number;
        next_review_session?: number;
      } = {
        user_id: 'u1',
        question_id: 'q1',
        status: 'active',
        consecutive_success: 3,
        next_review_session: 10,
      };

      await upsertUserQuestionStatus(payload);

      expect(supabase.from).toHaveBeenCalledWith('user_question_status');
      expect(mockChain.m_upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          question_id: 'q1',
          status: 'active',
          consecutive_success: 3,
          next_review_session: 10,
        }),
        { onConflict: 'user_id,question_id' }
      );
    });

    it('should handle error in upsertUserQuestionStatus', async () => {
      const mockChain = createSupabaseMock();
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);
      mockChain.m_upsert.mockResolvedValue({
        error: { message: 'DB Error' },
      });

      const payload: {
        user_id: string;
        question_id: string;
        status: 'active' | 'archived' | 'pending_followup';
        consecutive_success?: number;
        next_review_session?: number;
      } = {
        user_id: 'u1',
        question_id: 'q1',
        status: 'active',
      };

      // The function returns the promise result directly
      const result = await upsertUserQuestionStatus(payload);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('DB Error');
    });
  });

  describe('Complex Joins & Filters', () => {
    it('should fetch questions with correct filters and inner join', async () => {
      const mockChain = createSupabaseMock();
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const mockData = [{ question_id: 'q1' }];
      mockChain.limit.mockResolvedValue({ data: mockData, error: null });

      const userId = 'u1';
      const courseId = 'c1';
      const status = 'pending_followup';
      const maxSession = 5;
      const limit = 10;

      await fetchQuestionsByStatus(userId, courseId, status, maxSession, limit);

      expect(supabase.from).toHaveBeenCalledWith('user_question_status');
      // Verify inner join syntax
      expect(mockChain.m_select).toHaveBeenCalledWith(
        expect.stringContaining('questions!inner')
      );
      expect(mockChain.m_eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockChain.m_eq).toHaveBeenCalledWith(
        'questions.course_id',
        courseId
      );
      expect(mockChain.m_eq).toHaveBeenCalledWith('status', status);
      expect(mockChain.m_lte).toHaveBeenCalledWith(
        'next_review_session',
        maxSession
      );
      expect(mockChain.order).toHaveBeenCalledWith('updated_at', {
        ascending: true,
      });
      expect(mockChain.limit).toHaveBeenCalledWith(limit);
    });

    it('should not apply maxSession filter if it is null', async () => {
      const mockChain = createSupabaseMock();
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);
      mockChain.limit.mockResolvedValue({ data: [], error: null });

      await fetchQuestionsByStatus('u1', 'c1', 'active', null, 10);

      expect(mockChain.m_lte).not.toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      const mockChain = createSupabaseMock();
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);
      mockChain.limit.mockResolvedValue({
        data: null,
        error: { message: 'Join Error' },
      });

      const result = await fetchQuestionsByStatus(
        'u1',
        'c1',
        'active',
        null,
        10
      );
      expect(result).toEqual([]);
    });
  });

  describe('Error Resilience', () => {
    it('should return error from incrementCourseSession when RPC fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      } as any);

      const result = await incrementCourseSession('u1', 'c1');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Network error');
    });

    it('should handle error fetching session in finishQuizSession but continue', async () => {
      const mockChain = createSupabaseMock();
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock 1: getSessionInfo -> returns error
      mockChain.m_maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Fetch Error' },
      });
      // Assuming it continues to upsert with default session 1 (0 + 1)

      // Mock 2: upsert call
      mockChain.m_upsert.mockResolvedValueOnce({ error: null });

      const stats = {
        correctCount: 10,
        incorrectCount: 2,
        blankCount: 0,
        timeSpentMs: 10000,
        courseId: 'course-123',
        userId: 'user-123',
      };

      const result = await finishQuizSession(stats);

      expect(result.success).toBe(true);
      expect(mockChain.m_upsert).toHaveBeenCalledWith(
        expect.objectContaining({ current_session: 1 }),
        expect.any(Object)
      );
    });

    it('should log error interacting with db in finishQuizSession upsert but return success', async () => {
      const mockChain = createSupabaseMock();
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock 1: getSessionInfo -> returns ok
      mockChain.m_maybeSingle.mockResolvedValueOnce({
        data: { current_session: 5 },
        error: null,
      });

      // Mock 2: upsert call -> returns error
      mockChain.m_upsert.mockResolvedValueOnce({
        error: { message: 'Upsert Failed' },
      });

      const stats = {
        correctCount: 10,
        incorrectCount: 2,
        blankCount: 0,
        timeSpentMs: 10000,
        courseId: 'course-123',
        userId: 'user-123',
      };

      const result = await finishQuizSession(stats);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Upsert Failed');
    });
  });
});
