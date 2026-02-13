import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import * as quizService from '@/shared/lib/core/services/quiz.service';
import { supabase } from '@/shared/lib/core/supabase';
import { getSubjectStrategy } from '@/features/quiz/algoritma/strategy';
import type { Database } from '@/shared/types/supabase';

type NoteChunkRow = Database['public']['Tables']['note_chunks']['Row'];

type MockChunkData = Pick<
  NoteChunkRow,
  'id' | 'course_name' | 'content' | 'metadata' | 'ai_logic'
>;

// Mock Supabase
vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock Strategy
vi.mock('@/features/quiz/algoritma/strategy', () => ({
  getSubjectStrategy: vi.fn(),
}));

describe('Quiz Service Tests', () => {
  const mockUserId = 'user-123';
  const mockCourseId = 'course-456';
  const mockTopic = 'Test Topic';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-11T12:00:00Z'));
  });

  const createMockQuery = (data: unknown, error: unknown = null) => {
    const query: {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      neq: ReturnType<typeof vi.fn>;
      gte: ReturnType<typeof vi.fn>;
      lt: ReturnType<typeof vi.fn>;
      lte: ReturnType<typeof vi.fn>;
      gt: ReturnType<typeof vi.fn>;
      in: ReturnType<typeof vi.fn>;
      not: ReturnType<typeof vi.fn>;
      or: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
      maybeSingle: ReturnType<typeof vi.fn>;
      single: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      then: ReturnType<typeof vi.fn>;
    } = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      then: vi
        .fn()
        .mockImplementation(
          (cb: (result: { data: unknown; error: unknown }) => unknown) =>
            cb({ data, error })
        ),
    };
    return query;
  };

  describe('getNoteChunkById', () => {
    it('should return chunk data for valid UUID', async () => {
      const mockData = {
        content: 'Test content',
        metadata: {},
        course: { course_slug: 'test-course' },
      };
      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getNoteChunkById(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      expect(result).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith('note_chunks');
    });

    it('should return null for invalid UUID', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await quizService.getNoteChunkById('invalid-uuid');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuditPath] ⚠️ Invalid UUID passed to getNoteChunkById: invalid-uuid',
        ''
      );
      consoleSpy.mockRestore();
    });

    it('should return null when chunk not found (PGRST116 error)', async () => {
      const mockError = { code: 'PGRST116', message: 'Not found' };
      (supabase.from as Mock).mockReturnValue(createMockQuery(null, mockError));

      const result = await quizService.getNoteChunkById(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      expect(result).toBeNull();
    });

    it('should return null and log error for other errors', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockError = { code: 'OTHER', message: 'DB Error' };
      (supabase.from as Mock).mockReturnValue(createMockQuery(null, mockError));

      const result = await quizService.getNoteChunkById(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuditPath] ❌ Error fetching note chunk:',
        mockError
      );
      consoleSpy.mockRestore();
    });
  });

  describe('getCourseTopics', () => {
    it('should return empty array when courseId is null', async () => {
      const result = await quizService.getCourseTopics(mockUserId, null);
      expect(result).toEqual([]);
    });

    it('should return course topics successfully', async () => {
      const mockChunks = [
        {
          id: 'chunk-1',
          course_id: mockCourseId,
          section_title: 'Topic 1',
          chunk_order: 1,
        },
        {
          id: 'chunk-2',
          course_id: mockCourseId,
          section_title: 'Topic 2',
          chunk_order: 2,
        },
      ];
      (supabase.from as Mock).mockReturnValue(createMockQuery(mockChunks));

      const result = await quizService.getCourseTopics(
        mockUserId,
        mockCourseId
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('questionCount', 0);
    });

    it('should return empty array on error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Error' })
      );

      const result = await quizService.getCourseTopics(
        mockUserId,
        mockCourseId
      );

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('getCourseIdBySlug', () => {
    it('should return course ID for valid slug', async () => {
      (supabase.from as Mock).mockReturnValue(
        createMockQuery({ id: mockCourseId })
      );

      const result = await quizService.getCourseIdBySlug('test-course');

      expect(result).toBe(mockCourseId);
    });

    it('should return null when course not found', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Not found' })
      );

      const result = await quizService.getCourseIdBySlug('non-existent');

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('getUniqueCourseTopics', () => {
    it('should return unique topic names', async () => {
      const mockData = [
        { section_title: 'Topic A' },
        { section_title: 'Topic B' },
        { section_title: 'Topic A' }, // Duplicate
        { section_title: null }, // Null value
      ];
      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getUniqueCourseTopics(mockCourseId);

      expect(result).toEqual(['Topic A', 'Topic B']);
    });

    it('should return empty array on error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Error' })
      );

      const result = await quizService.getUniqueCourseTopics(mockCourseId);

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('getTopicQuestionCount', () => {
    it('should return question count', async () => {
      const mockQuery = createMockQuery(null);
      mockQuery.select = vi.fn().mockReturnThis();
      (supabase.from as Mock).mockReturnValue(mockQuery);

      // Override the then to return count
      const queryWithCount = {
        ...mockQuery,
        then: vi
          .fn()
          .mockImplementation(
            (cb: (result: { count: number; error: unknown }) => unknown) =>
              cb({ count: 10, error: null })
          ),
      };
      (supabase.from as Mock).mockReturnValue(queryWithCount);

      const result = await quizService.getTopicQuestionCount(
        mockCourseId,
        mockTopic
      );

      expect(result).toBe(10);
    });

    it('should return 0 on error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockQuery = createMockQuery(null);
      const queryWithError = {
        ...mockQuery,
        then: vi
          .fn()
          .mockImplementation(
            (cb: (result: { count: number; error: unknown }) => unknown) =>
              cb({ count: 0, error: { message: 'Error' } })
          ),
      };
      (supabase.from as Mock).mockReturnValue(queryWithError);

      const result = await quizService.getTopicQuestionCount(
        mockCourseId,
        mockTopic
      );

      expect(result).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  describe('getCoursePoolCount', () => {
    it('should return pool count for antrenman', async () => {
      const mockQuery = createMockQuery(null);
      const queryWithCount = {
        ...mockQuery,
        then: vi
          .fn()
          .mockImplementation(
            (cb: (result: { count: number; error: unknown }) => unknown) =>
              cb({ count: 50, error: null })
          ),
      };
      (supabase.from as Mock).mockReturnValue(queryWithCount);

      const result = await quizService.getCoursePoolCount(
        mockCourseId,
        'antrenman'
      );

      expect(result).toBe(50);
    });

    it('should return 0 on error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockQuery = createMockQuery(null);
      const queryWithError = {
        ...mockQuery,
        then: vi
          .fn()
          .mockImplementation(
            (cb: (result: { count: number; error: unknown }) => unknown) =>
              cb({ count: 0, error: { message: 'Error' } })
          ),
      };
      (supabase.from as Mock).mockReturnValue(queryWithError);

      const result = await quizService.getCoursePoolCount(
        mockCourseId,
        'deneme'
      );

      expect(result).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  describe('getTopicCompletionStatus', () => {
    it('should return completion status with AI quotas', async () => {
      const mockChunk: MockChunkData = {
        id: 'chunk-1',
        course_name: 'Test Course',
        content: 'Test content for word count',
        metadata: {
          concept_map: [
            {
              baslik: 'Concept 1',
              odak: 'Focus 1',
              seviye: 'Bilgi',
              gorsel: null,
            },
          ],
          difficulty_index: 3,
        },
        ai_logic: {
          suggested_quotas: { antrenman: 15, arsiv: 5, deneme: 5 },
        },
      };

      const mockQuestions = [
        { id: 'q1', usage_type: 'antrenman', parent_question_id: null },
        { id: 'q2', usage_type: 'deneme', parent_question_id: null },
        { id: 'q3', usage_type: 'arsiv', parent_question_id: null },
      ];

      const mockSolvedData = [{ question_id: 'q1' }];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') {
          return createMockQuery(mockChunk);
        }
        if (table === 'course_session_counters') {
          return createMockQuery({ current_session: 5 });
        }
        if (table === 'questions') {
          return createMockQuery(mockQuestions);
        }
        if (table === 'user_question_status') {
          return createMockQuery([]);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery(mockSolvedData);
        }
        return createMockQuery([]);
      });

      (getSubjectStrategy as Mock).mockReturnValue({ importance: 'high' });

      const result = await quizService.getTopicCompletionStatus(
        mockUserId,
        mockCourseId,
        mockTopic
      );

      expect(result.completed).toBe(false);
      expect(result.antrenman.solved).toBe(1);
      expect(result.antrenman.total).toBeGreaterThan(0);
      expect(result.importance).toBe('high');
      expect(result.aiLogic).toBeDefined();
      expect(result.concepts).toHaveLength(1);
      expect(result.difficultyIndex).toBe(3);
    });

    it('should return default status when no chunk exists', async () => {
      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') {
          return createMockQuery(null);
        }
        if (table === 'questions') {
          return createMockQuery([]);
        }
        return createMockQuery([]);
      });

      const result = await quizService.getTopicCompletionStatus(
        mockUserId,
        mockCourseId,
        mockTopic
      );

      expect(result.completed).toBe(false);
      expect(result.antrenman.solved).toBe(0);
      expect(result.antrenman.total).toBe(0); // no chunk = no quota
      expect(result.importance).toBe('medium'); // default importance
    });

    it('should handle questions fetch error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockChunk: MockChunkData = {
        id: 'chunk-1',
        course_name: 'Test Course',
        content: 'Test content for word count',
        metadata: {},
        ai_logic: null,
      };

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') {
          return createMockQuery(mockChunk);
        }
        if (table === 'course_session_counters') {
          return createMockQuery({ current_session: 5 });
        }
        if (table === 'questions') {
          return createMockQuery(null, { message: 'Error' });
        }
        return createMockQuery([]);
      });

      (getSubjectStrategy as Mock).mockReturnValue({ importance: 'medium' });

      const result = await quizService.getTopicCompletionStatus(
        mockUserId,
        mockCourseId,
        mockTopic
      );

      expect(result.completed).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should handle solved data fetch error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockChunk: MockChunkData = {
        id: 'chunk-1',
        course_name: 'Test Course',
        content: 'Test content for word count',
        metadata: {},
        ai_logic: null,
      };

      const mockQuestions = [
        { id: 'q1', usage_type: 'antrenman', parent_question_id: null },
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') {
          return createMockQuery(mockChunk);
        }
        if (table === 'course_session_counters') {
          return createMockQuery({ current_session: 5 });
        }
        if (table === 'questions') {
          return createMockQuery(mockQuestions);
        }
        if (table === 'user_question_status') {
          return createMockQuery([]);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery(null, { message: 'Error' });
        }
        return createMockQuery([]);
      });

      (getSubjectStrategy as Mock).mockReturnValue({ importance: 'medium' });

      const result = await quizService.getTopicCompletionStatus(
        mockUserId,
        mockCourseId,
        mockTopic
      );

      expect(result.completed).toBe(false);
      expect(result.antrenman.solved).toBe(0);
      consoleSpy.mockRestore();
    });

    it('should mark as completed when all antrenman solved', async () => {
      const mockChunk: MockChunkData = {
        id: 'chunk-1',
        course_name: 'Test Course',
        content: 'Test content for word count',
        metadata: {},
        ai_logic: null,
      };

      // target_count=10 -> fallbackAntrenman = Math.max(5, ceil(10*0.25)) = 5
      // Need at least 5 antrenman questions to complete
      const mockQuestions = [
        { id: 'q1', usage_type: 'antrenman', parent_question_id: null },
        { id: 'q2', usage_type: 'antrenman', parent_question_id: null },
        { id: 'q3', usage_type: 'antrenman', parent_question_id: null },
        { id: 'q4', usage_type: 'antrenman', parent_question_id: null },
        { id: 'q5', usage_type: 'antrenman', parent_question_id: null },
      ];

      const mockSolvedData = [
        { question_id: 'q1' },
        { question_id: 'q2' },
        { question_id: 'q3' },
        { question_id: 'q4' },
        { question_id: 'q5' },
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') {
          return createMockQuery(mockChunk);
        }
        if (table === 'course_session_counters') {
          return createMockQuery({ current_session: 5 });
        }
        if (table === 'questions') {
          return createMockQuery(mockQuestions);
        }
        if (table === 'user_question_status') {
          return createMockQuery([]);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery(mockSolvedData);
        }
        return createMockQuery([]);
      });

      (getSubjectStrategy as Mock).mockReturnValue({ importance: 'medium' });

      const result = await quizService.getTopicCompletionStatus(
        mockUserId,
        mockCourseId,
        mockTopic
      );

      expect(result.completed).toBe(true);
    });

    it('should handle questions with parent_question_id (mistakes)', async () => {
      const mockChunk: MockChunkData = {
        id: 'chunk-1',
        course_name: 'Test Course',
        content: 'Test content for word count',
        metadata: {},
        ai_logic: null,
      };

      // Questions with parent_question_id should be counted as mistakes
      const mockQuestions = [
        { id: 'q1', usage_type: 'antrenman', parent_question_id: null },
        { id: 'q2', usage_type: 'antrenman', parent_question_id: 'parent-1' }, // mistake
        { id: 'q3', usage_type: 'deneme', parent_question_id: 'parent-2' }, // mistake (parent overrides)
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') {
          return createMockQuery(mockChunk);
        }
        if (table === 'course_session_counters') {
          return createMockQuery({ current_session: 5 });
        }
        if (table === 'questions') {
          return createMockQuery(mockQuestions);
        }
        if (table === 'user_question_status') {
          return createMockQuery([]);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery([]);
        }
        return createMockQuery([]);
      });

      (getSubjectStrategy as Mock).mockReturnValue({ importance: 'medium' });

      const result = await quizService.getTopicCompletionStatus(
        mockUserId,
        mockCourseId,
        mockTopic
      );

      expect(result.mistakes.existing).toBe(2);
      expect(result.mistakes.total).toBe(2);
      expect(result.antrenman.existing).toBe(1);
    });
  });

  describe('getCourseTopicsWithCounts', () => {
    it('should return topics with counts', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      const mockChunks = [
        { section_title: 'Topic A', chunk_order: 1 },
        { section_title: 'Topic B', chunk_order: 2 },
        { section_title: 'Topic A', chunk_order: 3 }, // Duplicate
      ];

      const mockQuestions = [
        {
          id: 'q1',
          section_title: 'Topic A',
          usage_type: 'antrenman',
          parent_question_id: null,
        },
        {
          id: 'q2',
          section_title: 'Topic A',
          usage_type: 'antrenman',
          parent_question_id: null,
        },
        {
          id: 'q3',
          section_title: 'Topic B',
          usage_type: 'deneme',
          parent_question_id: null,
        },
      ];

      const mockSolved = [{ question_id: 'q1' }];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') {
          return createMockQuery(mockChunks);
        }
        if (table === 'questions') {
          return createMockQuery(mockQuestions);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery(mockSolved);
        }
        return createMockQuery([]);
      });

      const result = await quizService.getCourseTopicsWithCounts(mockCourseId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Topic A');
      expect(result[0].counts.antrenman).toBe(2);
      expect(result[0].isCompleted).toBe(false);
    });

    it('should return empty array when no chunks found', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
      });
      (supabase.from as Mock).mockReturnValue(createMockQuery([]));

      const result = await quizService.getCourseTopicsWithCounts(mockCourseId);

      expect(result).toEqual([]);
    });

    it('should handle chunks error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      // Mock chunks query that returns error
      const mockQuery = createMockQuery([]);
      const errorQuery = {
        ...mockQuery,
        then: vi
          .fn()
          .mockImplementation(
            (cb: (result: { data: unknown; error: unknown }) => unknown) =>
              cb({ data: null, error: { message: 'DB Error' } })
          ),
      };

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') {
          return errorQuery;
        }
        return createMockQuery([]);
      });

      const result = await quizService.getCourseTopicsWithCounts(mockCourseId);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuditPath] ❌ Error fetching course topics:',
        expect.any(Object)
      );
      consoleSpy.mockRestore();
    });

    it('should handle questions error', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      const mockChunks = [{ section_title: 'Topic A', chunk_order: 1 }];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') {
          return createMockQuery(mockChunks);
        }
        if (table === 'questions') {
          return createMockQuery(null, { message: 'Error' });
        }
        return createMockQuery([]);
      });

      const result = await quizService.getCourseTopicsWithCounts(mockCourseId);

      expect(result).toHaveLength(1);
      expect(result[0].counts.antrenman).toBe(0);
    });

    it('should count arsiv and deneme questions correctly', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      const mockChunks = [{ section_title: 'Topic A', chunk_order: 1 }];
      const mockQuestions = [
        {
          id: 'q1',
          section_title: 'Topic A',
          usage_type: 'antrenman',
          parent_question_id: null,
        },
        {
          id: 'q2',
          section_title: 'Topic A',
          usage_type: 'arsiv',
          parent_question_id: null,
        },
        {
          id: 'q3',
          section_title: 'Topic A',
          usage_type: 'deneme',
          parent_question_id: null,
        },
        {
          id: 'q4',
          section_title: 'Topic A',
          usage_type: 'antrenman',
          parent_question_id: 'parent-1', // mistake - shouldn't count
        },
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') {
          return createMockQuery(mockChunks);
        }
        if (table === 'questions') {
          return createMockQuery(mockQuestions);
        }
        return createMockQuery([]);
      });

      const result = await quizService.getCourseTopicsWithCounts(mockCourseId);

      expect(result).toHaveLength(1);
      expect(result[0].counts.antrenman).toBe(1);
      expect(result[0].counts.arsiv).toBe(1);
      expect(result[0].counts.deneme).toBe(1);
      expect(result[0].counts.total).toBe(4);
    });

    it('should handle no user logged in', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
      });

      const mockChunks = [{ section_title: 'Topic A', chunk_order: 1 }];
      const mockQuestions = [
        {
          id: 'q1',
          section_title: 'Topic A',
          usage_type: 'antrenman',
          parent_question_id: null,
        },
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'note_chunks') {
          return createMockQuery(mockChunks);
        }
        if (table === 'questions') {
          return createMockQuery(mockQuestions);
        }
        return createMockQuery([]);
      });

      const result = await quizService.getCourseTopicsWithCounts(mockCourseId);

      expect(result).toHaveLength(1);
      expect(result[0].isCompleted).toBe(false);
    });
  });

  describe('getTopicQuestions', () => {
    it('should return mapped questions', async () => {
      const mockData = [
        {
          question_data: {
            type: 'multiple_choice',
            q: 'Question 1?',
            o: ['A', 'B', 'C', 'D'],
            a: 0,
            exp: 'Explanation',
            img: 1,
          },
          course: { course_slug: 'test-course' },
        },
        {
          question_data: {
            type: 'multiple_choice',
            q: 'Question 2?',
            o: ['A', 'B', 'C', 'D'],
            a: 1,
            exp: 'Explanation 2',
          },
          course: { course_slug: 'test-course' },
        },
      ];

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getTopicQuestions(
        mockCourseId,
        mockTopic
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('q', 'Question 1?');
      expect(result[0]).toHaveProperty('imgPath', '/notes/test-course/media/');
      expect(result[1].imgPath).toBeUndefined();
    });

    it('should return empty array on error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Error' })
      );

      const result = await quizService.getTopicQuestions(
        mockCourseId,
        mockTopic
      );

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should handle null data response', async () => {
      const mockQuery = createMockQuery(null);
      const queryWithNullData = {
        ...mockQuery,
        then: vi
          .fn()
          .mockImplementation(
            (cb: (result: { data: unknown; error: unknown }) => unknown) =>
              cb({ data: null, error: null })
          ),
      };
      (supabase.from as Mock).mockReturnValue(queryWithNullData);

      const result = await quizService.getTopicQuestions(
        mockCourseId,
        mockTopic
      );

      expect(result).toEqual([]);
    });
  });

  describe('getFirstChunkIdForTopic', () => {
    it('should return chunk ID', async () => {
      (supabase.from as Mock).mockReturnValue(
        createMockQuery({ id: 'chunk-123' })
      );

      const result = await quizService.getFirstChunkIdForTopic(
        mockCourseId,
        mockTopic
      );

      expect(result).toBe('chunk-123');
    });

    it('should return null on error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Error' })
      );

      const result = await quizService.getFirstChunkIdForTopic(
        mockCourseId,
        mockTopic
      );

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should return null when data has no id', async () => {
      (supabase.from as Mock).mockReturnValue(createMockQuery({}));

      const result = await quizService.getFirstChunkIdForTopic(
        mockCourseId,
        mockTopic
      );

      expect(result).toBeNull();
    });
  });

  describe('getQuizStats', () => {
    it('should calculate quiz stats correctly', async () => {
      const mockData = [
        { response_type: 'correct' },
        { response_type: 'correct' },
        { response_type: 'incorrect' },
        { response_type: 'blank' },
      ];

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getQuizStats(mockUserId);

      expect(result.totalAnswered).toBe(4);
      expect(result.correct).toBe(2);
      expect(result.incorrect).toBe(1);
      expect(result.blank).toBe(1);
      expect(result.successRate).toBe(50);
    });

    it('should return zero stats when no data', async () => {
      (supabase.from as Mock).mockReturnValue(createMockQuery([]));

      const result = await quizService.getQuizStats(mockUserId);

      expect(result.totalAnswered).toBe(0);
      expect(result.successRate).toBe(0);
    });

    it('should handle error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Error' })
      );

      const result = await quizService.getQuizStats(mockUserId);

      expect(result.totalAnswered).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  describe('getSubjectCompetency', () => {
    it('should calculate competency scores', async () => {
      const mockCourses = [
        { id: 'course-1', name: 'Math' },
        { id: 'course-2', name: 'Science' },
      ];

      const mockProgress = [
        { course_id: 'course-1', response_type: 'correct' },
        { course_id: 'course-1', response_type: 'correct' },
        { course_id: 'course-1', response_type: 'incorrect' },
        { course_id: 'course-2', response_type: 'correct' },
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'courses') {
          return createMockQuery(mockCourses);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery(mockProgress);
        }
        return createMockQuery([]);
      });

      const result = await quizService.getSubjectCompetency(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].subject).toBe('Math');
      expect(result[0].score).toBe(67); // 2/3 * 100 rounded
      expect(result[0].totalQuestions).toBe(3);
    });

    it('should return empty array on courses error', async () => {
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Error' })
      );

      const result = await quizService.getSubjectCompetency(mockUserId);

      expect(result).toEqual([]);
    });

    it('should return empty array on progress error', async () => {
      const mockCourses = [{ id: 'course-1', name: 'Math' }];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'courses') {
          return createMockQuery(mockCourses);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery(null, { message: 'Error' });
        }
        return createMockQuery([]);
      });

      const result = await quizService.getSubjectCompetency(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle unknown course names', async () => {
      const mockCourses = [{ id: 'course-1', name: 'Math' }];

      // Progress has course_id that doesn't exist in courses
      const mockProgress = [
        { course_id: 'course-1', response_type: 'correct' },
        { course_id: 'course-2', response_type: 'correct' }, // Unknown course
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'courses') {
          return createMockQuery(mockCourses);
        }
        if (table === 'user_quiz_progress') {
          return createMockQuery(mockProgress);
        }
        return createMockQuery([]);
      });

      const result = await quizService.getSubjectCompetency(mockUserId);

      expect(result).toHaveLength(2);
      const unknownCourse = result.find((r) => r.subject === 'Unknown');
      expect(unknownCourse).toBeDefined();
      expect(unknownCourse?.totalQuestions).toBe(1);
    });
  });

  describe('getBloomStats', () => {
    it('should calculate bloom stats correctly', async () => {
      const mockData = [
        { response_type: 'correct', question: { bloom_level: 'knowledge' } },
        { response_type: 'correct', question: { bloom_level: 'knowledge' } },
        { response_type: 'incorrect', question: { bloom_level: 'knowledge' } },
        { response_type: 'correct', question: { bloom_level: 'application' } },
        { response_type: 'incorrect', question: { bloom_level: 'analysis' } },
      ];

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getBloomStats(mockUserId);

      expect(result).toHaveLength(3);
      const knowledge = result.find((r) => r.level === 'knowledge');
      expect(knowledge?.correct).toBe(2);
      expect(knowledge?.total).toBe(3);
      expect(knowledge?.score).toBe(67);
    });

    it('should return empty array on error', async () => {
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Error' })
      );

      const result = await quizService.getBloomStats(mockUserId);

      expect(result).toEqual([]);
    });

    it('should return zero score for levels with no questions', async () => {
      const mockData = [
        { response_type: 'correct', question: { bloom_level: 'knowledge' } },
      ];

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getBloomStats(mockUserId);

      expect(result).toHaveLength(3);
      const application = result.find((r) => r.level === 'application');
      expect(application?.total).toBe(0);
      expect(application?.score).toBe(0);
    });

    it('should ignore questions with unknown bloom levels', async () => {
      const mockData = [
        { response_type: 'correct', question: { bloom_level: 'knowledge' } },
        {
          response_type: 'correct',
          question: { bloom_level: 'unknown_level' },
        },
        { response_type: 'correct', question: { bloom_level: 'evaluation' } },
      ];

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getBloomStats(mockUserId);

      expect(result).toHaveLength(3);
      const knowledge = result.find((r) => r.level === 'knowledge');
      expect(knowledge?.total).toBe(1);
      expect(knowledge?.correct).toBe(1);
    });
  });

  describe('getSRSStats', () => {
    it('should categorize mastery scores correctly', async () => {
      const mockData = [
        { mastery_score: 0 },
        { mastery_score: 20 },
        { mastery_score: 50 },
        { mastery_score: 90 },
        { mastery_score: 85 },
      ];

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getSRSStats(mockUserId);

      expect(result.new).toBe(1);
      expect(result.learning).toBe(1);
      expect(result.review).toBe(1);
      expect(result.mastered).toBe(2);
    });

    it('should return empty stats on error', async () => {
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Error' })
      );

      const result = await quizService.getSRSStats(mockUserId);

      expect(result).toEqual({ new: 0, learning: 0, review: 0, mastered: 0 });
    });
  });

  describe('getRecentQuizSessions', () => {
    it('should return recent quiz sessions', async () => {
      const mockData = [
        {
          course_id: 'course-1',
          session_number: 1,
          response_type: 'correct',
          answered_at: '2026-02-11T10:00:00Z',
          course: { name: 'Math' },
        },
        {
          course_id: 'course-1',
          session_number: 1,
          response_type: 'incorrect',
          answered_at: '2026-02-11T10:05:00Z',
          course: { name: 'Math' },
        },
        {
          course_id: 'course-1',
          session_number: 2,
          response_type: 'correct',
          answered_at: '2026-02-11T11:00:00Z',
          course: { name: 'Math' },
        },
      ];

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getRecentQuizSessions(mockUserId, 5);

      expect(result).toHaveLength(2);
      expect(result[0].sessionNumber).toBe(2);
      expect(result[0].correct).toBe(1);
      expect(result[0].total).toBe(1);
      expect(result[0].successRate).toBe(100);

      expect(result[1].sessionNumber).toBe(1);
      expect(result[1].correct).toBe(1);
      expect(result[1].incorrect).toBe(1);
      expect(result[1].total).toBe(2);
      expect(result[1].successRate).toBe(50);
    });

    it('should limit results correctly', async () => {
      const mockData = Array(10).fill({
        course_id: 'course-1',
        session_number: 1,
        response_type: 'correct',
        answered_at: '2026-02-11T10:00:00Z',
        course: { name: 'Math' },
      });

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getRecentQuizSessions(mockUserId, 2);

      expect(result).toHaveLength(1); // All same session
    });

    it('should handle error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Error' })
      );

      const result = await quizService.getRecentQuizSessions(mockUserId);

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should handle null course name', async () => {
      const mockData = [
        {
          course_id: 'course-1',
          session_number: 1,
          response_type: 'correct',
          answered_at: '2026-02-11T10:00:00Z',
          course: null,
        },
      ];

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getRecentQuizSessions(mockUserId);

      expect(result[0].courseName).toBe('Kavram Testi');
    });

    it('should count blank responses correctly', async () => {
      const mockData = [
        {
          course_id: 'course-1',
          session_number: 1,
          response_type: 'correct',
          answered_at: '2026-02-11T10:00:00Z',
          course: { name: 'Math' },
        },
        {
          course_id: 'course-1',
          session_number: 1,
          response_type: 'blank',
          answered_at: '2026-02-11T10:01:00Z',
          course: { name: 'Math' },
        },
        {
          course_id: 'course-1',
          session_number: 1,
          response_type: 'other', // neither correct nor incorrect
          answered_at: '2026-02-11T10:02:00Z',
          course: { name: 'Math' },
        },
      ];

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getRecentQuizSessions(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].correct).toBe(1);
      expect(result[0].incorrect).toBe(0);
      expect(result[0].blank).toBe(2); // blank + other
      expect(result[0].total).toBe(3);
    });

    it('should handle null answered_at date', async () => {
      const mockData = [
        {
          course_id: 'course-1',
          session_number: 1,
          response_type: 'correct',
          answered_at: null,
          course: { name: 'Math' },
        },
      ];

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getRecentQuizSessions(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBeDefined();
    });

    it('should handle null session_number', async () => {
      const mockData = [
        {
          course_id: 'course-1',
          session_number: null,
          response_type: 'correct',
          answered_at: '2026-02-11T10:00:00Z',
          course: { name: 'Math' },
        },
      ];

      (supabase.from as Mock).mockReturnValue(createMockQuery(mockData));

      const result = await quizService.getRecentQuizSessions(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].sessionNumber).toBe(0);
    });
  });

  describe('getRecentCognitiveInsights', () => {
    it('should return cognitive insights with consecutive fails', async () => {
      const mockProgress = [
        {
          id: 'p1',
          course_id: 'course-1',
          question_id: 'q1',
          ai_diagnosis: 'Needs review',
          ai_insight: 'Focus on basics',
          response_type: 'incorrect',
          answered_at: '2026-02-11T10:00:00Z',
        },
        {
          id: 'p2',
          course_id: 'course-1',
          question_id: 'q2',
          ai_diagnosis: null,
          ai_insight: 'Good progress',
          response_type: 'correct',
          answered_at: '2026-02-11T11:00:00Z',
        },
      ];

      const mockStatus = [
        { question_id: 'q1', consecutive_fails: 3 },
        { question_id: 'q2', consecutive_fails: 0 },
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'user_quiz_progress') {
          return createMockQuery(mockProgress);
        }
        if (table === 'user_question_status') {
          return createMockQuery(mockStatus);
        }
        return createMockQuery([]);
      });

      const result = await quizService.getRecentCognitiveInsights(
        mockUserId,
        10
      );

      expect(result).toHaveLength(2);
      expect(result[0].consecutiveFails).toBe(3);
      expect(result[0].diagnosis).toBe('Needs review');
      expect(result[1].consecutiveFails).toBe(0);
      expect(result[1].insight).toBe('Good progress');
    });

    it('should return empty array on error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (supabase.from as Mock).mockReturnValue(
        createMockQuery(null, { message: 'Error' })
      );

      const result = await quizService.getRecentCognitiveInsights(mockUserId);

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should handle empty status data', async () => {
      const mockProgress = [
        {
          id: 'p1',
          course_id: 'course-1',
          question_id: 'q1',
          ai_diagnosis: 'Test',
          ai_insight: null,
          response_type: 'incorrect',
          answered_at: '2026-02-11T10:00:00Z',
        },
      ];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'user_quiz_progress') {
          return createMockQuery(mockProgress);
        }
        if (table === 'user_question_status') {
          return createMockQuery([]);
        }
        return createMockQuery([]);
      });

      const result = await quizService.getRecentCognitiveInsights(mockUserId);

      expect(result[0].consecutiveFails).toBe(0);
    });

    it('should handle null answered_at date', async () => {
      const mockProgress = [
        {
          id: 'p1',
          course_id: 'course-1',
          question_id: 'q1',
          ai_diagnosis: 'Test',
          ai_insight: null,
          response_type: 'incorrect',
          answered_at: null,
        },
      ];

      const mockStatus = [{ question_id: 'q1', consecutive_fails: 2 }];

      (supabase.from as Mock).mockImplementation((table) => {
        if (table === 'user_quiz_progress') {
          return createMockQuery(mockProgress);
        }
        if (table === 'user_question_status') {
          return createMockQuery(mockStatus);
        }
        return createMockQuery([]);
      });

      const result = await quizService.getRecentCognitiveInsights(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBeDefined();
      expect(result[0].consecutiveFails).toBe(2);
    });
  });
});
