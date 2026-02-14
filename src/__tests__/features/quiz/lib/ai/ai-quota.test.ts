import { describe, expect, it } from 'vitest';
import { ConceptMapResponseSchema } from '@/features/quiz/lib/ai/schemas';
import { validateAndProtectQuotas } from '@/shared/lib/core/quota';

describe('AI Quota Logic & Protection', () => {
  it('should validate ConceptMapResponseSchema with quotas and reasoning', () => {
    const validData = {
      difficulty_index: 4,
      concepts: [
        {
          baslik: 'Test Kavram',
          odak: 'Test Odak',
          seviye: 'Bilgi',
          gorsel: null,
        },
      ],
      quotas: {
        antrenman: 8,
        arsiv: 3,
        deneme: 2,
      },
    };

    const result = ConceptMapResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quotas.antrenman).toBe(8);
    }
  });

  it('should enforce minimum quotas via validateAndProtectQuotas', () => {
    const lowQuotas = {
      antrenman: 1,
      arsiv: 0,
      deneme: 0,
    };

    const protectedQuotas = validateAndProtectQuotas(lowQuotas);
    expect(protectedQuotas.antrenman).toBe(3);
    expect(protectedQuotas.arsiv).toBe(1);
    expect(protectedQuotas.deneme).toBe(1);
  });

  it('should provide default quotas for empty Partial<QuotaSet>', () => {
    const protectedQuotas = validateAndProtectQuotas({});
    expect(protectedQuotas.antrenman).toBe(5);
    expect(protectedQuotas.arsiv).toBe(2);
    expect(protectedQuotas.deneme).toBe(2);
  });
});
