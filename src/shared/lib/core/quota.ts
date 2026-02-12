/**
 * Quota Protection Logic
 *
 * Validates AI-determined quotas and ensures minimum safety thresholds.
 * Part of the "Bilişsel Doygunluk" (Cognitive Saturation) model.
 */

export interface QuotaSet {
  antrenman: number;
  arsiv: number;
  deneme: number;
}

/**
 * Validates and adjusts AI-provided quotas for safety.
 * Min Antrenman: 5 (minimum protection for training pool)
 * Min Arsiv: 1
 * Min Deneme: 1
 */
export function validateAndProtectQuotas(
  aiQuotas: Partial<QuotaSet>
): QuotaSet {
  return {
    antrenman: Math.max(3, aiQuotas.antrenman ?? 5),
    arsiv: Math.max(1, aiQuotas.arsiv ?? 2),
    deneme: Math.max(1, aiQuotas.deneme ?? 2),
  };
}
