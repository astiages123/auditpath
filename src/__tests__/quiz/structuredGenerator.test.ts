import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mocks = vi.hoisted(() => ({
  llmGenerate: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@/features/quiz/services/quizInfoService', () => ({
  UnifiedLLMClient: {
    generate: mocks.llmGenerate,
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: mocks.loggerError,
  },
}));

import { generate } from '@/features/quiz/logic/structuredGenerator';
import { GeneratedQuestionSchema } from '@/features/quiz/types';

describe('structuredGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns typed data for valid JSON with Turkish aliases', async () => {
    mocks.llmGenerate.mockResolvedValue({
      content: JSON.stringify({
        soru: 'Vergi hukukunda tarh işleminin ilk aşaması nedir?',
        secenekler: ['Tebliğ', 'Tarh', 'Tahsil', 'Ceza', 'Uzlaşma'],
        dogru_cevap: 1,
        aciklama: 'Tarh, verginin hesaplanarak miktar olarak belirlenmesidir.',
      }),
    });

    const result = await generate([{ role: 'user', content: 'test' }], {
      schema: GeneratedQuestionSchema,
      maxRetries: 1,
    });

    expect(result).toMatchObject({
      q: 'Vergi hukukunda tarh işleminin ilk aşaması nedir?',
      a: 1,
      exp: 'Tarh, verginin hesaplanarak miktar olarak belirlenmesidir.',
    });
  });

  it('retries after a parse failure and succeeds on the next valid response', async () => {
    mocks.llmGenerate
      .mockResolvedValueOnce({
        content: '{"soru":"Eksik JSON"',
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          soru: 'Denetimde bağımsızlık neden önemlidir?',
          secenekler: ['Tarafsızlık', 'Hız', 'Maliyet', 'Yetki', 'Rapor'],
          dogru_cevap: 0,
          aciklama:
            'Bağımsızlık, denetçinin tarafsız değerlendirme yapabilmesini sağlar.',
        }),
      });

    const onLog = vi.fn();

    const result = await generate([{ role: 'user', content: 'test' }], {
      schema: GeneratedQuestionSchema,
      maxRetries: 1,
      onLog,
    });

    expect(result?.q).toContain('Denetimde bağımsızlık');
    expect(mocks.llmGenerate).toHaveBeenCalledTimes(2);
    expect(
      onLog.mock.calls.some((call) => String(call[0]).includes('JSON parse'))
    ).toBe(true);
  });

  it('accepts markdown fenced and think-wrapped JSON responses', async () => {
    mocks.llmGenerate.mockResolvedValue({
      content:
        '<think>İç değerlendirme</think>\n```json\n{"soru":"Muhasebede dönemsellik ilkesi neyi ifade eder?","secenekler":["Gelir-gider eşleştirmesi","Kasa fazlası","Vergi oranı","Stok sayımı","Kur farkı"],"dogru_cevap":0,"aciklama":"Dönemsellik, gelir ve giderlerin ilgili oldukları dönemde muhasebeleştirilmesini ifade eder."}\n```',
    });

    const result = await generate([{ role: 'user', content: 'test' }], {
      schema: GeneratedQuestionSchema,
      maxRetries: 0,
    });

    expect(result).toMatchObject({
      q: 'Muhasebede dönemsellik ilkesi neyi ifade eder?',
      a: 0,
    });
  });

  it('retries schema-invalid responses until maxRetries is exhausted', async () => {
    const schema = z.object({
      ok: z.boolean(),
    });

    mocks.llmGenerate
      .mockResolvedValueOnce({ content: '{"ok":"evet"}' })
      .mockResolvedValueOnce({ content: '{"ok":"hala-hatali"}' });

    const onLog = vi.fn();

    const result = await generate([{ role: 'user', content: 'test' }], {
      schema,
      maxRetries: 1,
      onLog,
    });

    expect(result).toBeNull();
    expect(mocks.llmGenerate).toHaveBeenCalledTimes(2);
    expect(
      onLog.mock.calls.some((call) =>
        String(call[0]).includes('Şema doğrulama')
      )
    ).toBe(true);
  });
});
