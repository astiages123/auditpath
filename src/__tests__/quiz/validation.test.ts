import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
}));

vi.mock('@/features/quiz/logic/structuredGenerator', () => ({
  generate: mocks.generate,
}));

import { validateBatch } from '@/features/quiz/logic/validation';
import type { GeneratedQuestion } from '@/features/quiz/types';

describe('validateBatch', () => {
  const questions: GeneratedQuestion[] = [
    {
      q: 'Vergi hukukunda verginin kanuniliği ilkesi neyi ifade eder?',
      o: [
        'Kanuni dayanak',
        'Bütçe açığı',
        'KDV oranı',
        'İcra takibi',
        'Teminat',
      ],
      a: 0,
      exp: 'Vergi ancak kanunla konulur, değiştirilir ve kaldırılır.',
      bloomLevel: 'knowledge',
      concept: 'Verginin kanuniliği',
      img: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps valid decisions as returned', async () => {
    mocks.generate.mockResolvedValue({
      results: [
        {
          index: 0,
          total_score: 85,
          decision: 'APPROVED',
          critical_faults: [],
          improvement_suggestion: '',
        },
      ],
    });

    const result = await validateBatch(
      questions,
      'Türkçe referans içerik ve açıklama metni'
    );

    expect(result?.results[0].decision).toBe('APPROVED');
  });

  it('overrides REJECTED to APPROVED when total_score is 70 or above', async () => {
    mocks.generate.mockResolvedValue({
      results: [
        {
          index: 0,
          total_score: 72,
          decision: 'REJECTED',
          critical_faults: ['Ufak ifade problemi'],
          improvement_suggestion: 'Açıklama kısaltılabilir.',
        },
      ],
    });

    const result = await validateBatch(questions, 'Türkçe içerik');

    expect(result?.results[0].decision).toBe('APPROVED');
  });

  it('overrides APPROVED to REJECTED when total_score is below 70', async () => {
    mocks.generate.mockResolvedValue({
      results: [
        {
          index: 0,
          total_score: 40,
          decision: 'APPROVED',
          critical_faults: ['Doğru cevap ile açıklama çelişiyor'],
          improvement_suggestion: 'Seçenekleri yeniden yaz.',
        },
      ],
    });

    const result = await validateBatch(questions, 'Türkçe içerik');

    expect(result?.results[0].decision).toBe('REJECTED');
  });

  it('returns null when structured generation fails', async () => {
    mocks.generate.mockResolvedValue(null);

    const result = await validateBatch(questions, 'Türkçe içerik');

    expect(result).toBeNull();
  });
});
