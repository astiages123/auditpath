/**
 * Quota Calculation Logic
 *
 * Scientific Master Set (Bilimsel Master Set)
 * Dynamic quota calculation based on Knowledge Density (Concept + Exception count).
 */

/**
 * Calculate quota based on Concept Map density.
 *
 * Formula: (Concepts + Exceptions) * Importance Multiplier
 *
 * Multipliers:
 * - High: 1.2
 * - Medium: 1.0 (default)
 * - Low: 0.8
 *
 * Min Quota: 3
 */
export function calculateConceptBasedQuota(
  concepts: { isException?: boolean }[],
  courseImportance: 'high' | 'medium' | 'low' = 'medium'
): {
  total: number;
  antrenman: number;
  arsiv: number;
  deneme: number;
  // Telemetry
  baseCount: number;
  multiplier: number;
} {
  // 1. Base Count (Concepts + Exceptions)
  const baseCount = concepts.length;

  // 2. Multiplier
  let multiplier = 1.0;
  if (courseImportance === 'high') {
    multiplier = 1.2;
  } else if (courseImportance === 'low') {
    multiplier = 0.8;
  }

  // 3. Final Calculation & Clamping
  const adjustedCount = baseCount * multiplier;
  // Lower bound 3, No Upper Bound
  const finalCount = Math.max(3, Math.round(adjustedCount));

  // Distribute quota (keeping existing distribution logic for now)
  // Antrenman is the main target.
  const antrenman = finalCount;
  // Archive and Trial are supplementary, usually calculated as a fraction of training or separate
  // For now, let's keep the 25% ratio from the previous logic as a safe default,
  // though the prompt implies we just want "Soru Sayısı" which usually maps to Antrenman in this context.
  const arsiv = Math.ceil(antrenman * 0.25);
  const deneme = Math.ceil(antrenman * 0.25);

  return {
    total: antrenman + arsiv + deneme,
    antrenman,
    arsiv,
    deneme,
    baseCount,
    multiplier,
  };
}
