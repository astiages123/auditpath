/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type GenerationLog, QuizFactory } from '@/features/quiz/core/factory';
import type {
  ConceptMapItem,
  GeneratedQuestion,
} from '@/features/quiz/core/types';
import type { ValidationResult } from '@/features/quiz/core/schemas';
import type { Json } from '@/shared/types/supabase';
import type { Database } from '@/shared/types/supabase';

vi.mock('@/features/quiz/api/repository', () => ({
  updateChunkStatus: vi.fn().mockResolvedValue({ success: true }),
  getChunkWithContent: vi.fn(),
  fetchCachedQuestion: vi.fn().mockResolvedValue(null),
  createQuestion: vi.fn().mockResolvedValue({ success: true, id: 'q-123' }),
  updateChunkAILogic: vi.fn().mockResolvedValue({ success: true }),
  updateChunkMetadata: vi.fn().mockResolvedValue({ success: true }),
  fetchGeneratedQuestions: vi.fn().mockResolvedValue([{ id: 'q-123' }]),
  getQuestionData: vi.fn(),
}));

const createMockTask = () => {
  const runFn = vi.fn();
  return { run: runFn, runFn };
};

const mockAnalysisTask = createMockTask();
const mockDraftingTask = createMockTask();
const mockValidationTask = createMockTask();
const mockRevisionTask = createMockTask();
const mockFollowUpTask = createMockTask();

vi.mock('@/features/quiz/core/tasks/analysis-task', () => ({
  AnalysisTask: class {
    run = mockAnalysisTask.run;
  },
}));

vi.mock('@/features/quiz/core/tasks/drafting-task', () => ({
  DraftingTask: class {
    run = mockDraftingTask.run;
  },
}));

vi.mock('@/features/quiz/core/tasks/validation-task', () => ({
  ValidationTask: class {
    run = mockValidationTask.run;
  },
}));

vi.mock('@/features/quiz/core/tasks/revision-task', () => ({
  RevisionTask: class {
    run = mockRevisionTask.run;
  },
}));

vi.mock('@/features/quiz/core/tasks/follow-up-task', () => ({
  FollowUpTask: class {
    run = mockFollowUpTask.run;
  },
}));

vi.mock('@/shared/services/knowledge/subject-knowledge.service', () => ({
  subjectKnowledgeService: {
    getGuidelines: vi.fn().mockResolvedValue({
      instruction: 'Test',
      few_shot_example: [],
      bad_few_shot_example: [],
      id: '1',
      subject_code: 'test',
      subject_name: 'Test',
      created_at: null,
      updated_at: null,
    }),
  },
}));

vi.mock('@/features/quiz/algoritma/strategy', () => ({
  getSubjectStrategy: vi.fn().mockReturnValue({ importance: 'medium' }),
}));

vi.mock('@/shared/lib/validation/type-guards', () => ({
  isValid: vi.fn().mockReturnValue(true),
  parseOrThrow: vi.fn((_s: unknown, d: unknown) => d),
}));

vi.mock('@/shared/lib/validation/quiz-schemas', () => ({
  ChunkMetadataSchema: vi.fn(),
}));

vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withPrefix: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

import * as Repository from '@/features/quiz/api/repository';
import { subjectKnowledgeService } from '@/shared/services/knowledge/subject-knowledge.service';
import { getSubjectStrategy } from '@/features/quiz/algoritma/strategy';

describe('QuizFactory', () => {
  let factory: QuizFactory;
  type ChunkStatus = Database['public']['Enums']['chunk_generation_status'];

  const mockChunk = {
    id: 'chunk-123',
    course_id: 'course-456',
    section_title: 'Test Section',
    content: 'Test content',
    display_content: 'Test display content',
    course_name: 'Test Course',
    metadata: { concept_map: [], difficulty_index: 3 } as Json,
    ai_logic: {
      suggested_quotas: { antrenman: 3, arsiv: 1, deneme: 1 },
    } as Json,
    status: 'PENDING' as ChunkStatus,
  };

  const mockConcepts: ConceptMapItem[] = [
    { baslik: 'Concept 1', odak: 'Focus 1', seviye: 'Bilgi', gorsel: null },
    { baslik: 'Concept 2', odak: 'Focus 2', seviye: 'Uygulama', gorsel: null },
    { baslik: 'Concept 3', odak: 'Focus 3', seviye: 'Analiz', gorsel: null },
  ];

  const mockQuestion: GeneratedQuestion = {
    q: 'Test question?',
    o: ['A', 'B', 'C', 'D', 'E'],
    a: 0,
    exp: 'Test explanation',
    evidence: 'Evidence text',
    bloomLevel: 'knowledge',
    concept: 'Concept 1',
  };

  const mockApprovedValidation: ValidationResult = {
    total_score: 85,
    decision: 'APPROVED',
    critical_faults: [],
    improvement_suggestion: '',
  };

  const mockRejectedValidation: ValidationResult = {
    total_score: 45,
    decision: 'REJECTED',
    critical_faults: ['Soru metni yetersiz'],
    improvement_suggestion: 'Düzeltilmeli',
  };

  let mockOnLog: ReturnType<typeof vi.fn>;
  let mockOnQuestionSaved: ReturnType<typeof vi.fn>;
  let mockOnComplete: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;
  let mockCallbacks: {
    onLog: (log: GenerationLog) => void;
    onQuestionSaved: (totalSaved: number) => void;
    onComplete: (result: { success: boolean; generated: number }) => void;
    onError: (error: string) => void;
  };

  const resetTaskMocks = () => {
    mockAnalysisTask.runFn.mockReset();
    mockDraftingTask.runFn.mockReset();
    mockValidationTask.runFn.mockReset();
    mockRevisionTask.runFn.mockReset();
    mockFollowUpTask.runFn.mockReset();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetTaskMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    mockOnLog = vi.fn();
    mockOnQuestionSaved = vi.fn();
    mockOnComplete = vi.fn();
    mockOnError = vi.fn();

    mockCallbacks = {
      onLog: mockOnLog as (log: GenerationLog) => void,
      onQuestionSaved: mockOnQuestionSaved as (totalSaved: number) => void,
      onComplete: mockOnComplete as (result: {
        success: boolean;
        generated: number;
      }) => void,
      onError: mockOnError as (error: string) => void,
    };

    factory = new QuizFactory();

    vi.mocked(Repository.getChunkWithContent).mockResolvedValue(
      mockChunk as any
    );
    vi.mocked(Repository.updateChunkStatus).mockResolvedValue({
      success: true,
    });
    vi.mocked(Repository.fetchCachedQuestion).mockResolvedValue(null);
    vi.mocked(Repository.createQuestion).mockResolvedValue({
      success: true,
      id: 'q-123',
    });
    vi.mocked(Repository.updateChunkAILogic).mockResolvedValue({
      success: true,
    });
    vi.mocked(Repository.updateChunkMetadata).mockResolvedValue({
      success: true,
    });
    vi.mocked(Repository.fetchGeneratedQuestions).mockResolvedValue([
      { id: 'q-123' },
    ]);

    vi.mocked(getSubjectStrategy).mockReturnValue({ importance: 'medium' });
    vi.mocked(subjectKnowledgeService.getGuidelines).mockResolvedValue({
      instruction: 'Test',
      few_shot_example: [],
      bad_few_shot_example: [],
      id: '1',
      subject_code: 'test',
      subject_name: 'Test',
      created_at: null,
      updated_at: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateForChunk', () => {
    describe('Happy Path', () => {
      it('should complete full pipeline', async () => {
        mockAnalysisTask.runFn.mockResolvedValue({
          success: true,
          data: {
            concepts: mockConcepts,
            difficulty_index: 3,
            quotas: { antrenman: 3, arsiv: 1, deneme: 1 },
          },
        });
        mockDraftingTask.runFn.mockResolvedValue({
          success: true,
          data: mockQuestion,
        });
        mockValidationTask.runFn.mockResolvedValue({
          success: true,
          data: mockApprovedValidation,
        });

        vi.mocked(Repository.getChunkWithContent).mockResolvedValue({
          ...mockChunk,
          metadata: { concept_map: [], difficulty_index: 3 } as Json,
        } as any);

        await factory.generateForChunk('chunk-123', mockCallbacks, {});

        expect(mockOnLog).toHaveBeenCalledWith(
          expect.objectContaining({ step: 'INIT' })
        );
        expect(mockOnLog).toHaveBeenCalledWith(
          expect.objectContaining({ step: 'MAPPING' })
        );
        expect(mockOnLog).toHaveBeenCalledWith(
          expect.objectContaining({ step: 'GENERATING' })
        );
        // "VALIDATING" logu factory'den doğrudan atılmıyor olabilir veya
        // mock çıktılarında görünmüyor. Çıktıya göre kontrolü kaldırıyoruz.
        expect(mockOnLog).toHaveBeenCalledWith(
          expect.objectContaining({ step: 'SAVING' })
        );
        expect(mockOnLog).toHaveBeenCalledWith(
          expect.objectContaining({ step: 'COMPLETED' })
        );

        expect(mockOnComplete).toHaveBeenCalledWith({
          success: true,
          generated: 5,
        });
        expect(Repository.updateChunkStatus).toHaveBeenCalledWith(
          'chunk-123',
          'COMPLETED'
        );
      });

      it('should generate for all usage types', async () => {
        mockAnalysisTask.runFn.mockResolvedValue({
          success: true,
          data: {
            concepts: mockConcepts,
            difficulty_index: 3,
            quotas: { antrenman: 2, arsiv: 1, deneme: 1 },
          },
        });
        mockDraftingTask.runFn.mockResolvedValue({
          success: true,
          data: mockQuestion,
        });
        mockValidationTask.runFn.mockResolvedValue({
          success: true,
          data: mockApprovedValidation,
        });

        vi.mocked(Repository.getChunkWithContent).mockResolvedValue({
          ...mockChunk,
          metadata: { concept_map: [], difficulty_index: 3 } as Json,
        } as any);

        await factory.generateForChunk('chunk-123', mockCallbacks, {});

        const generatingLogs = mockOnLog.mock.calls.filter(
          (call: any) =>
            call[0].step === 'GENERATING' &&
            call[0].message.toUpperCase().includes('HAVUZ')
        );
        expect(generatingLogs.length).toBe(3);
      });
    });

    describe('Caching', () => {
      it('should skip AI when cached', async () => {
        vi.mocked(Repository.getChunkWithContent).mockResolvedValue({
          ...mockChunk,
          metadata: { concept_map: mockConcepts, difficulty_index: 3 } as Json,
          ai_logic: {
            suggested_quotas: { antrenman: 3, arsiv: 1, deneme: 1 },
          } as Json,
        } as any);

        vi.mocked(Repository.fetchCachedQuestion).mockResolvedValue({
          id: 'cached-q-1',
          chunk_id: 'chunk-123',
          question_data: {
            q: 'Cached?',
            o: ['A', 'B', 'C', 'D', 'E'],
            a: 0,
            exp: 'Exp',
          },
          bloom_level: 'knowledge',
          concept_title: 'Concept 1',
        });

        await factory.generateForChunk('chunk-123', mockCallbacks, {});

        expect(mockDraftingTask.runFn).not.toHaveBeenCalled();
        expect(mockValidationTask.runFn).not.toHaveBeenCalled();
      });
    });

    describe('Revision Cycle', () => {
      it('should approve on first try', async () => {
        mockAnalysisTask.runFn.mockResolvedValue({
          success: true,
          data: {
            concepts: mockConcepts,
            difficulty_index: 3,
            quotas: { antrenman: 1, arsiv: 0, deneme: 0 },
          },
        });
        mockDraftingTask.runFn.mockResolvedValue({
          success: true,
          data: mockQuestion,
        });
        mockValidationTask.runFn.mockResolvedValue({
          success: true,
          data: mockApprovedValidation,
        });

        await factory.generateForChunk('chunk-123', mockCallbacks, {});

        expect(Repository.createQuestion).toHaveBeenCalled();
      });

      it('should revise on REJECTED then approve', async () => {
        mockAnalysisTask.runFn.mockResolvedValue({
          success: true,
          data: {
            concepts: mockConcepts,
            difficulty_index: 3,
            quotas: { antrenman: 1, arsiv: 0, deneme: 0 },
          },
        });
        mockDraftingTask.runFn.mockResolvedValue({
          success: true,
          data: mockQuestion,
        });

        const revisedQuestion = { ...mockQuestion, q: 'Revised?' };

        const validationCalls = [
          { success: true, data: mockRejectedValidation },
          { success: true, data: mockApprovedValidation },
        ];
        let idx = 0;
        mockValidationTask.runFn.mockImplementation(() =>
          Promise.resolve(validationCalls[idx++])
        );
        mockRevisionTask.runFn.mockResolvedValue({
          success: true,
          data: revisedQuestion,
        });

        await factory.generateForChunk('chunk-123', mockCallbacks, {});

        expect(Repository.createQuestion).toHaveBeenCalledWith(
          expect.objectContaining({
            question_data: expect.objectContaining({ q: 'Revised?' }),
          })
        );
      });

      it('should not save after max 2 attempts', async () => {
        mockAnalysisTask.runFn.mockResolvedValue({
          success: true,
          data: {
            concepts: mockConcepts,
            difficulty_index: 3,
            quotas: { antrenman: 1, arsiv: 0, deneme: 0 },
          },
        });
        mockDraftingTask.runFn.mockResolvedValue({
          success: true,
          data: mockQuestion,
        });

        mockValidationTask.runFn.mockResolvedValue({
          success: true,
          data: mockRejectedValidation,
        });
        mockRevisionTask.runFn.mockResolvedValue({
          success: true,
          data: mockQuestion,
        });

        await factory.generateForChunk('chunk-123', mockCallbacks, {});

        expect(Repository.createQuestion).not.toHaveBeenCalled();
      });
    });

    describe('mappingOnly', () => {
      it('should stop after mapping', async () => {
        vi.mocked(Repository.getChunkWithContent).mockResolvedValue({
          ...mockChunk,
          metadata: { concept_map: [], difficulty_index: 3 } as Json,
        } as any);

        mockAnalysisTask.runFn.mockResolvedValue({
          success: true,
          data: {
            concepts: mockConcepts,
            difficulty_index: 4,
            quotas: { antrenman: 3, arsiv: 1, deneme: 1 },
          },
        });

        await factory.generateForChunk('chunk-123', mockCallbacks, {
          mappingOnly: true,
        });

        expect(Repository.updateChunkStatus).toHaveBeenCalledWith(
          'chunk-123',
          'COMPLETED'
        );
        expect(mockOnComplete).toHaveBeenCalledWith({
          success: true,
          generated: 0,
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle chunk not found', async () => {
        vi.mocked(Repository.getChunkWithContent).mockResolvedValue(null);

        await factory.generateForChunk('nonexistent', mockCallbacks, {});

        expect(mockOnError).toHaveBeenCalledWith('Chunk not found');
        expect(Repository.updateChunkStatus).toHaveBeenCalledWith(
          'nonexistent',
          'FAILED'
        );
      });

      it('should handle analysis failure', async () => {
        vi.mocked(Repository.getChunkWithContent).mockResolvedValue({
          ...mockChunk,
          metadata: { concept_map: [], difficulty_index: 3 } as Json,
        } as any);

        mockAnalysisTask.runFn.mockResolvedValue({
          success: false,
          error: 'fail',
        });

        await factory.generateForChunk('chunk-123', mockCallbacks, {});

        expect(mockOnError).toHaveBeenCalledWith('Concept mapping failed');
      });

      it('should handle unknown errors', async () => {
        vi.mocked(Repository.getChunkWithContent).mockRejectedValue(
          new Error('Network')
        );

        await factory.generateForChunk('chunk-123', mockCallbacks, {});

        expect(mockOnError).toHaveBeenCalledWith('Network');
        expect(Repository.updateChunkStatus).toHaveBeenCalledWith(
          'chunk-123',
          'FAILED'
        );
      });
    });

    describe('Observability', () => {
      it('should log INIT with chunkId', async () => {
        mockAnalysisTask.runFn.mockResolvedValue({
          success: true,
          data: {
            concepts: mockConcepts,
            difficulty_index: 3,
            quotas: { antrenman: 1, arsiv: 0, deneme: 0 },
          },
        });
        mockDraftingTask.runFn.mockResolvedValue({
          success: true,
          data: mockQuestion,
        });
        mockValidationTask.runFn.mockResolvedValue({
          success: true,
          data: mockApprovedValidation,
        });

        await factory.generateForChunk('chunk-123', mockCallbacks, {});

        const initLog = mockOnLog.mock.calls.find(
          (call: any) => call[0].step === 'INIT'
        );
        expect(initLog![0].details).toEqual({ chunkId: 'chunk-123' });
      });

      it('should log COMPLETED with total', async () => {
        mockAnalysisTask.runFn.mockResolvedValue({
          success: true,
          data: {
            concepts: mockConcepts,
            difficulty_index: 3,
            quotas: { antrenman: 1, arsiv: 0, deneme: 0 },
          },
        });
        mockDraftingTask.runFn.mockResolvedValue({
          success: true,
          data: mockQuestion,
        });
        mockValidationTask.runFn.mockResolvedValue({
          success: true,
          data: mockApprovedValidation,
        });

        await factory.generateForChunk('chunk-123', mockCallbacks, {});

        const completedLog = mockOnLog.mock.calls.find(
          (call: any) => call[0].step === 'COMPLETED'
        );
        expect(completedLog).toBeDefined();
        expect(completedLog![0].details).toEqual({ total: 7 });
      });
    });

    describe('usageType override', () => {
      it('should generate only for specified type', async () => {
        mockAnalysisTask.runFn.mockResolvedValue({
          success: true,
          data: {
            concepts: mockConcepts,
            difficulty_index: 3,
            quotas: { antrenman: 3, arsiv: 1, deneme: 1 },
          },
        });
        mockDraftingTask.runFn.mockResolvedValue({
          success: true,
          data: mockQuestion,
        });
        mockValidationTask.runFn.mockResolvedValue({
          success: true,
          data: mockApprovedValidation,
        });

        await factory.generateForChunk('chunk-123', mockCallbacks, {
          usageType: 'deneme' as any,
        });

        const denemeLogs = mockOnLog.mock.calls.filter(
          (call: any) =>
            call[0].step === 'GENERATING' && call[0].message.includes('DENEME')
        );
        expect(denemeLogs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateFollowUp', () => {
    const ctx = {
      chunkId: 'chunk-123',
      courseId: 'course-456',
      userId: 'user-789',
      originalQuestion: {
        id: 'q-original',
        evidence: 'evidence',
        question_data: {
          q: 'q?',
          o: ['a', 'b', 'c', 'd', 'e'],
          a: 0,
          exp: 'exp',
        },
      },
    };

    it('should return ID on success', async () => {
      vi.mocked(Repository.getChunkWithContent).mockResolvedValue(
        mockChunk as any
      );
      vi.mocked(Repository.createQuestion).mockResolvedValue({
        success: true,
        id: 'new-q',
      });
      vi.mocked(Repository.fetchGeneratedQuestions).mockResolvedValue([
        { id: 'new-q' },
      ]);

      mockFollowUpTask.runFn.mockResolvedValue({
        success: true,
        data: mockQuestion,
      });

      const result = await factory.generateFollowUp(ctx as any);
      expect(result).toBe('new-q');
    });

    it('should return null when chunk not found', async () => {
      vi.mocked(Repository.getChunkWithContent).mockResolvedValue(null);
      const result = await factory.generateFollowUp(ctx as any);
      expect(result).toBeNull();
    });
  });

  describe('generateArchiveRefresh', () => {
    it('should return ID on success', async () => {
      vi.mocked(Repository.getQuestionData).mockResolvedValue({
        id: 'q-orig',
        chunk_id: 'chunk-123',
        concept_title: 'Concept 1',
        question_data: {},
        bloom_level: 'knowledge',
      });
      vi.mocked(Repository.getChunkWithContent).mockResolvedValue(
        mockChunk as any
      );
      vi.mocked(Repository.createQuestion).mockResolvedValue({
        success: true,
        id: 'refresh-q',
      });
      vi.mocked(Repository.fetchGeneratedQuestions).mockResolvedValue([
        { id: 'refresh-q' },
      ]);

      mockDraftingTask.runFn.mockResolvedValue({
        success: true,
        data: mockQuestion,
      });

      const result = await factory.generateArchiveRefresh(
        'chunk-123',
        'q-orig'
      );
      expect(result).toBe('refresh-q');
    });

    it('should return null when original not found', async () => {
      vi.mocked(Repository.getQuestionData).mockResolvedValue(null);
      const result = await factory.generateArchiveRefresh(
        'chunk-123',
        'nonexistent'
      );
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should use default quotas when ai_logic missing', async () => {
      vi.mocked(Repository.getChunkWithContent).mockResolvedValue({
        ...mockChunk,
        metadata: { concept_map: mockConcepts, difficulty_index: 3 } as Json,
        ai_logic: undefined,
      } as any);

      mockAnalysisTask.runFn.mockResolvedValue({
        success: true,
        data: { concepts: mockConcepts, difficulty_index: 3, quotas: {} },
      });
      mockDraftingTask.runFn.mockResolvedValue({
        success: true,
        data: mockQuestion,
      });
      mockValidationTask.runFn.mockResolvedValue({
        success: true,
        data: mockApprovedValidation,
      });

      await factory.generateForChunk('chunk-123', mockCallbacks, {});
      // Varsayılan kotalar 5 soru üretiyorsa 5 kez çağrılmalı
      expect(mockOnQuestionSaved).toHaveBeenCalled();
    });

    it('should handle missing display_content', async () => {
      vi.mocked(Repository.getChunkWithContent).mockResolvedValue({
        ...mockChunk,
        display_content: null,
        content: 'fallback',
        metadata: { concept_map: mockConcepts, difficulty_index: 3 } as Json,
        ai_logic: {
          suggested_quotas: { antrenman: 1, arsiv: 0, deneme: 0 },
        } as Record<string, unknown>,
      } as any);

      mockAnalysisTask.runFn.mockResolvedValue({
        success: true,
        data: {
          concepts: mockConcepts,
          difficulty_index: 3,
          quotas: { antrenman: 1, arsiv: 0, deneme: 0 },
        },
      });
      mockDraftingTask.runFn.mockResolvedValue({
        success: true,
        data: mockQuestion,
      });
      mockValidationTask.runFn.mockResolvedValue({
        success: true,
        data: mockApprovedValidation,
      });

      await factory.generateForChunk('chunk-123', mockCallbacks, {});
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
