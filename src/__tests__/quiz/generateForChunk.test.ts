import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateChunkStatus: vi.fn(),
  updateChunkAILogic: vi.fn(),
  getChunkWithContent: vi.fn(),
  fetchCachedQuestion: vi.fn(),
  createQuestion: vi.fn(),
  getSubjectGuidelines: vi.fn(),
  ensureConcepts: vi.fn(),
  draftBatch: vi.fn(),
  validateBatch: vi.fn(),
  reviseQuestion: vi.fn(),
  determineNodeStrategy: vi.fn(),
  shuffle: vi.fn((items: unknown[]) => items),
}));

vi.mock('@/features/quiz/services/quizSubmissionService', () => ({
  updateChunkStatus: mocks.updateChunkStatus,
  updateChunkAILogic: mocks.updateChunkAILogic,
}));

vi.mock('@/features/quiz/services/quizCoreService', () => ({
  getChunkWithContent: mocks.getChunkWithContent,
}));

vi.mock('@/features/quiz/services/quizQuestionService', () => ({
  createQuestion: mocks.createQuestion,
  fetchCachedQuestion: mocks.fetchCachedQuestion,
}));

vi.mock('@/features/quiz/services/quizInfoService', () => ({
  getSubjectGuidelines: mocks.getSubjectGuidelines,
}));

vi.mock('@/features/quiz/logic/analysis', () => ({
  analyzeNoteChunk: vi.fn(),
  ensureConcepts: mocks.ensureConcepts,
}));

vi.mock('@/features/quiz/logic/drafting', () => ({
  draftBatch: mocks.draftBatch,
  draftQuestion: vi.fn(),
}));

vi.mock('@/features/quiz/logic/validation', () => ({
  validateBatch: mocks.validateBatch,
}));

vi.mock('@/features/quiz/logic/revision', () => ({
  reviseQuestion: mocks.reviseQuestion,
}));

vi.mock('@/features/quiz/logic/quizParserStrategy', () => ({
  determineNodeStrategy: mocks.determineNodeStrategy,
  getSubjectStrategy: vi.fn(),
}));

vi.mock('@/features/quiz/utils/mathUtils', () => ({
  shuffle: mocks.shuffle,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { generateForChunk } from '@/features/quiz/logic/quizParser';
import type { ConceptMapItem, GeneratorCallbacks } from '@/features/quiz/types';

describe('generateForChunk', () => {
  const rawChunk = {
    id: 'chunk-1',
    course_id: 'course-1',
    metadata: {},
    status: 'READY',
    content: 'Türkçe ders içeriği',
    course_name: 'Vergi Hukuku',
    section_title: 'Vergi İlkeleri',
    ai_logic: {},
  };

  const concept: ConceptMapItem = {
    baslik: 'Verginin kanuniliği',
    odak: 'Verginin kanuni dayanağı',
    seviye: 'Analiz',
    gorsel: null,
  };

  const approvedQuestion = {
    q: 'Verginin kanuniliği ilkesi neyi ifade eder?',
    o: ['Kanunilik', 'Tahsil', 'Mükellefiyet', 'Tebligat', 'İndirim'],
    a: 0,
    exp: 'Vergi ancak kanunla konulur, değiştirilir ve kaldırılır.',
    evidence: '',
    diagnosis: '',
    insight: '',
    bloomLevel: 'analysis' as const,
    concept: concept.baslik,
    img: null,
  };

  function createCallbacks(): GeneratorCallbacks {
    return {
      onLog: vi.fn(),
      onTotalTargetCalculated: vi.fn(),
      onQuestionSaved: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getChunkWithContent.mockResolvedValue(rawChunk);
    mocks.updateChunkAILogic.mockResolvedValue({ error: null });
    mocks.fetchCachedQuestion.mockResolvedValue(null);
    mocks.getSubjectGuidelines.mockResolvedValue('Türkçe guideline');
    mocks.ensureConcepts.mockResolvedValue({
      concepts: [concept],
    });
    mocks.determineNodeStrategy.mockReturnValue({
      bloomLevel: 'analysis',
      instruction: 'Analiz sorusu üret',
    });
    mocks.createQuestion.mockResolvedValue({ error: null });
  });

  it('saves approved questions and completes the orchestration successfully', async () => {
    mocks.draftBatch.mockResolvedValue([approvedQuestion]);
    mocks.validateBatch.mockResolvedValue({
      results: [
        {
          index: 0,
          total_score: 90,
          decision: 'APPROVED',
          critical_faults: [],
          improvement_suggestion: '',
        },
      ],
    });

    const callbacks = createCallbacks();

    await generateForChunk('chunk-1', callbacks, {
      usageType: 'antrenman',
      userId: 'user-1',
    });

    expect(mocks.updateChunkStatus).toHaveBeenNthCalledWith(
      1,
      'chunk-1',
      'PROCESSING'
    );
    expect(mocks.draftBatch).toHaveBeenCalled();
    expect(mocks.validateBatch).toHaveBeenCalled();
    expect(mocks.reviseQuestion).not.toHaveBeenCalled();
    expect(mocks.createQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        chunk_id: 'chunk-1',
        usage_type: 'antrenman',
        created_by: 'user-1',
        concept_title: 'Verginin kanuniliği',
      })
    );
    expect(callbacks.onQuestionSaved).toHaveBeenCalledWith(1);
    expect(callbacks.onComplete).toHaveBeenCalledWith({
      success: true,
      generated: 1,
    });
    expect(mocks.updateChunkStatus).toHaveBeenLastCalledWith(
      'chunk-1',
      'COMPLETED'
    );
  });

  it('revises rejected questions before saving them', async () => {
    const revisedQuestion = {
      ...approvedQuestion,
      q: 'Revize edilmiş soru metni yeterince uzundur?',
    };

    mocks.draftBatch.mockResolvedValue([approvedQuestion]);
    mocks.validateBatch.mockResolvedValue({
      results: [
        {
          index: 0,
          total_score: 20,
          decision: 'REJECTED',
          critical_faults: ['Açıklama ile doğru cevap tutarsız'],
          improvement_suggestion: 'Soru kökünü netleştir.',
        },
      ],
    });
    mocks.reviseQuestion.mockResolvedValue(revisedQuestion);

    const callbacks = createCallbacks();

    await generateForChunk('chunk-1', callbacks, {
      usageType: 'deneme',
      userId: 'user-2',
    });

    expect(mocks.reviseQuestion).toHaveBeenCalledWith(
      approvedQuestion,
      expect.objectContaining({
        decision: 'REJECTED',
      }),
      expect.any(String)
    );
    expect(mocks.createQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        usage_type: 'deneme',
        created_by: 'user-2',
        question_data: expect.objectContaining({
          q: 'Revize edilmiş soru metni yeterince uzundur?',
        }),
      })
    );
    expect(callbacks.onComplete).toHaveBeenCalledWith({
      success: true,
      generated: 1,
    });
  });
});
