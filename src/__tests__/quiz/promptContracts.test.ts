import { describe, expect, it } from 'vitest';
import {
  buildBatchValidationPrompt,
  buildDraftingPrompt,
  buildFollowUpPrompt,
} from '@/features/quiz/logic/prompts';

describe('quiz prompt contracts', () => {
  it('includes concept-level strategy guidance for batch drafting', () => {
    const prompt = buildDraftingPrompt(
      [
        {
          baslik: 'Verginin kanuniliği',
          odak: 'Kanuni dayanak',
          seviye: 'Bilgi',
          gorsel: null,
        },
      ],
      {
        bloomLevel: 'knowledge',
        instruction: 'Temel kavramları sorgula.',
      },
      'antrenman',
      undefined,
      'Vergi Hukuku',
      [
        {
          baslik: 'Verginin kanuniliği',
          bloomLevel: 'knowledge',
          instruction: 'Temel kavramları sorgula.',
          focus: 'Kanuni dayanak',
        },
      ]
    );

    expect(prompt).toContain('KAVRAM BAZLI ÜRETİM PLANI');
    expect(prompt).toContain('Verginin kanuniliği');
    expect(prompt).toContain('seviye=Bilgi');
  });

  it('includes evidence, diagnosis and insight fields in batch validation prompt', () => {
    const prompt = buildBatchValidationPrompt([
      {
        q: 'Vergi ancak hangi normla konulur?',
        o: ['Kanun', 'Genelge', 'Yönetmelik', 'Teamül', 'Karar'],
        a: 0,
        exp: 'Vergi ancak kanunla konulur.',
        bloomLevel: 'knowledge',
        concept: 'Verginin kanuniliği',
        evidence: 'Anayasa ve vergi hukuku ilkeleri',
        diagnosis: 'Normlar hiyerarşisi karıştırılıyor.',
        insight: 'Vergi hukukunda kanunilik çekirdek ilkedir.',
        img: null,
      },
    ]);

    expect(prompt).toContain('"evidence"');
    expect(prompt).toContain('"diagnosis"');
    expect(prompt).toContain('"insight"');
  });

  it('keeps follow-up prompts focused on the question task without inlining context twice', () => {
    const prompt = buildFollowUpPrompt(
      'Vergi ancak kanunla konulur.',
      {
        q: 'Vergi hangi normla konulur?',
        o: ['Kanun', 'Genelge', 'Yönetmelik', 'Teamül', 'Karar'],
        a: 0,
        exp: 'Vergi ancak kanunla konulur.',
        bloomLevel: 'knowledge',
        concept: 'Verginin kanuniliği',
        evidence: 'Vergi ancak kanunla konulur.',
        diagnosis: 'Normlar hiyerarşisi karıştırılıyor.',
        insight: 'Kanunilik ilkesi çekirdek ilkedir.',
        img: null,
      },
      1,
      0,
      'analysis',
      ['Normlar hiyerarşisi karıştırılıyor.']
    );

    expect(prompt).toContain('Seviye: Analiz');
    expect(prompt).not.toContain('Bağlamı ve referans metni kullan');
  });
});
