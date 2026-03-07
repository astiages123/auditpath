import { describe, expect, it } from 'vitest';
import {
  GeneratedQuestionSchema,
  QuizQuestionSchema,
} from '@/features/quiz/types';

describe('quiz schema contracts', () => {
  it('generated question payloads remain readable by QuizQuestionSchema even when legacy rows omit type', () => {
    const generated = GeneratedQuestionSchema.parse({
      q: 'Vergi hukukunda tarh işlemi hangi aşamada verginin miktarını belirler?',
      o: ['Tahakkuk', 'Tarh', 'Tahsil', 'Tebliğ', 'Uzlaşma'],
      a: 1,
      exp: 'Tarh, verginin hesaplanarak miktar olarak belirlenmesidir.',
      evidence: 'Verginin miktarı tarh aşamasında belirlenir.',
      diagnosis: 'Tarh ile tahakkuk kavramları karıştırılıyor.',
      insight: 'Önce vergi hesaplanır, sonra hukuki sonuçları doğar.',
    });

    expect(QuizQuestionSchema.safeParse(generated).success).toBe(true);
  });

  it('QuizQuestionSchema rejects multiple choice questions with fewer than 5 options', () => {
    const result = QuizQuestionSchema.safeParse({
      type: 'multiple_choice',
      q: 'Hangisi verginin kanuniliği ilkesine örnektir?',
      o: ['Kanun', 'Genelge', 'Teamül', 'İçtihat'],
      a: 0,
      exp: 'Vergi ancak kanunla konulabilir.',
    });

    expect(result.success).toBe(false);
  });
});
