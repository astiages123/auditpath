import * as Repository from '@/features/quiz/services/repositories/quizRepository';
import { type ConceptMapItem } from '@/features/quiz/types';

export interface Quotas {
  antrenman: number;
  deneme: number;
  arsiv: number;
}

function validateAndProtectQuotas(quotas: Quotas): Quotas {
  return {
    ...quotas,
    antrenman: Math.max(5, quotas.antrenman),
  };
}

export function calculateQuotas(concepts: ConceptMapItem[]): Quotas {
  const count = concepts.length;
  const antrenmanBase = count;

  return validateAndProtectQuotas({
    antrenman: antrenmanBase,
    arsiv: Math.ceil(antrenmanBase * 0.3),
    deneme: Math.ceil(antrenmanBase * 0.2),
  });
}

export async function updateChunkQuotas(
  chunkId: string,
  quotas: Quotas
): Promise<void> {
  await Repository.updateChunkAILogic(chunkId, {
    suggested_quotas: quotas,
    reasoning:
      'Sistem tarafından otomatik belirlenen pedagojik kotalar (%100 antrenman, %30 arşiv, %20 deneme).',
  });
}
