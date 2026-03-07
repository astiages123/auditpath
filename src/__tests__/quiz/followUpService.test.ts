import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  insertQuestion: vi.fn(),
  updateProgressEq: vi.fn(),
  getQuestionData: vi.fn(),
  getChunkWithContent: vi.fn(),
  getRecentDiagnoses: vi.fn(),
  getSubjectGuidelines: vi.fn(),
  generateStructured: vi.fn(),
  getTaskConfig: vi.fn(),
  safeQuery: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'questions') {
        return {
          insert: mocks.insertQuestion,
        };
      }

      if (table === 'user_quiz_progress') {
        return {
          update: () => ({
            eq: mocks.updateProgressEq,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));

vi.mock('@/lib/supabaseHelpers', () => ({
  safeQuery: mocks.safeQuery,
}));

vi.mock('@/utils/aiConfig', () => ({
  getTaskConfig: mocks.getTaskConfig,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/features/quiz/services/quizReadService', () => ({
  getQuestionData: mocks.getQuestionData,
}));

vi.mock('@/features/quiz/services/quizChunkService', () => ({
  getChunkWithContent: mocks.getChunkWithContent,
  getRecentDiagnoses: mocks.getRecentDiagnoses,
}));

vi.mock('@/features/quiz/services/quizInfoService', () => ({
  getSubjectGuidelines: mocks.getSubjectGuidelines,
}));

vi.mock('@/features/quiz/logic/structuredGenerator', () => ({
  generate: mocks.generateStructured,
}));

import { generateFollowUpForWrongAnswer } from '@/features/quiz/services/followUpService';

describe('followUpService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getTaskConfig.mockReturnValue({ systemPromptPrefix: '' });
    mocks.getQuestionData.mockResolvedValue({
      chunk_id: 'chunk-1',
      bloom_level: 'analysis',
      concept_title: 'Verginin kanuniliği',
      question_data: {
        q: 'Vergi hangi normla konulur?',
        o: ['Kanun', 'Genelge', 'Yönetmelik', 'Teamül', 'Karar'],
        a: 0,
        exp: 'Vergi ancak kanunla konulur.',
        evidence: 'Vergi ancak kanunla konulur.',
        diagnosis: 'Normlar hiyerarşisi karıştırılıyor.',
        insight: 'Kanunilik ilkesi çekirdek ilkedir.',
      },
    });
    mocks.getChunkWithContent.mockResolvedValue({
      id: 'chunk-1',
      content: 'Tek bir bağlam satırı',
      course_name: 'Vergi Hukuku',
      section_title: 'Vergi İlkeleri',
    });
    mocks.getRecentDiagnoses.mockResolvedValue([
      'Normlar hiyerarşisi karıştırılıyor.',
    ]);
    mocks.getSubjectGuidelines.mockResolvedValue('Ek kural');
    mocks.generateStructured.mockResolvedValue({
      q: 'Takip sorusu yeterince uzundur ve geçerlidir?',
      o: ['A', 'B', 'C', 'D', 'E'],
      a: 0,
      exp: 'Açıklama da yeterince uzundur.',
      evidence: 'Vergi ancak kanunla konulur.',
      diagnosis: 'Aynı hata sürüyor.',
      insight: 'Kanunilik ilkesini tekrar et.',
      img: null,
    });
    mocks.insertQuestion.mockReturnValue({ __tag: 'insert' });
    mocks.updateProgressEq.mockReturnValue({ __tag: 'update' });
    mocks.safeQuery.mockResolvedValue({ success: true });
  });

  it('stores the resolved bloom level and sends context only once to the model', async () => {
    await generateFollowUpForWrongAnswer(
      'progress-1',
      'question-1',
      1,
      'user-1',
      'course-1',
      2
    );

    expect(mocks.insertQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        bloom_level: 'analysis',
      })
    );

    const messages = mocks.generateStructured.mock.calls[0]?.[0];
    expect(messages).toHaveLength(2);

    const userMessage = messages[1]?.content as string;
    const occurrences =
      userMessage.match(/Tek bir bağlam satırı/g)?.length ?? 0;
    expect(occurrences).toBe(1);
  });
});
