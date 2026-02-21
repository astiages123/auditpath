import { describe, expect, it, vi } from 'vitest';
import { validateBatch } from '../logic/quizParser';
import { StructuredGenerator } from '../logic/structuredGenerator';
import type { GeneratedQuestion } from '../types';

vi.mock('../logic/structuredGenerator', () => ({
  StructuredGenerator: {
    generate: vi.fn(),
  },
}));

describe('validateBatch', () => {
  it('should validate a batch of questions and return parsed results', async () => {
    const mockQuestions = [
      {
        q: 'Aşağıdakilerden hangisi idari yargıda dava açma süresidir?',
        o: ['15 gün', '30 gün', '45 gün', '60 gün', '90 gün'],
        a: 3,
        exp: 'İdari yargıda genel dava açma süresi Danıştay ve idare mahkemelerinde 60 gün, vergi mahkemelerinde 30 gündür.',
        evidence: 'İdari Yargılama Usulü Kanunu Madde 7',
        difficulty_index: 2,
        bloomLevel: 'knowledge',
        concept: 'İdari Yargı',
        questionType: 'multiple_choice',
      } as GeneratedQuestion,
      {
        q: 'Aşağıdakilerden hangisi idari yargıda dava açma süresidir?',
        o: ['15 gün', '30 gün', '45 gün', '60 gün', '90 gün'],
        a: 4,
        exp: 'Yanlış Açıklama',
        evidence: 'Yanlış Kanıt',
        difficulty_index: 2,
        bloomLevel: 'knowledge',
        concept: 'İdari Yargı',
        questionType: 'multiple_choice',
      } as GeneratedQuestion,
    ];

    const mockContent =
      'İdari yargılama usulü kanunu madde 7: Dava açma süresi, özel kanunlarında ayrı süre gösterilmeyen hallerde Danıştayda ve idare mahkemelerinde altmış gün, vergi mahkemelerinde otuz gündür.';

    const mockResponse = {
      results: [
        {
          index: 0,
          total_score: 100,
          decision: 'APPROVED',
          critical_faults: [],
          improvement_suggestion: '',
        },
        {
          index: 1,
          total_score: 40,
          decision: 'REJECTED',
          critical_faults: ['Bilgi hatası'],
          improvement_suggestion: 'Düzeltin',
        },
      ],
    };

    vi.mocked(StructuredGenerator.generate).mockResolvedValueOnce(mockResponse);

    const result = await validateBatch(mockQuestions, mockContent);

    expect(result).toEqual(mockResponse);
    expect(StructuredGenerator.generate).toHaveBeenCalledTimes(1);

    // Assert that the first argument to generate matches our expectations
    // It should be an array of messages
    const callArgs = vi.mocked(StructuredGenerator.generate).mock.calls[0][0];
    expect(Array.isArray(callArgs)).toBe(true);
    expect(callArgs.length).toBeGreaterThan(0);
    expect(callArgs[0].content).toContain(
      'Güvenlik ve Doğruluk Kontrolü Uzmanısın'
    );

    // Check that the taskPrompt contains the batched questions text
    const hasTaskPrompt = callArgs.some(
      (arg) =>
        arg.content &&
        typeof arg.content === 'string' &&
        arg.content.includes(
          'Aşağıdakilerden hangisi idari yargıda dava açma süresidir?'
        )
    );
    expect(hasTaskPrompt).toBe(true);
  });
});
