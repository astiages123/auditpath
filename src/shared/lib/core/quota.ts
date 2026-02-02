/**
 * Quota Calculation Logic
 *
 * Merkezi kota hesaplama mantığı.
 * Client (Browser) ve Server (Edge Function) tarafından ortak kullanılır.
 */

export const MIN_QUOTA = 8;
export const MAX_QUOTA = 30;

/**
 * Calculate quota based on word count and concept density
 */
export function calculateQuota(
    wordCount: number,
    conceptCount: number,
    sectionCount: number = 0,
): {
    total: number;
    antrenman: number;
    arsiv: number;
    deneme: number;
    baseCount: number;
    multiplier: number;
    conceptDensity: number;
    // Legacy aliases
    antrenmanCount: number;
    arsivCount: number;
    denemeCount: number;
} {
    // 1. Base Count Calculation (Square Root Formula)
    // Formula: Target = floor(sqrt(Word Count / 3))
    // Min 5, Max 30
    const calculatedBase = Math.floor(Math.sqrt(Math.max(0, wordCount) / 3));
    const baseCount = Math.min(MAX_QUOTA, Math.max(MIN_QUOTA, calculatedBase));

    // 2. Concept Density Multiplier
    const safeWordCount = wordCount > 0 ? wordCount : 1;
    const conceptDensity = conceptCount / safeWordCount;

    let multiplier = 1.0;
    if (conceptDensity < 0.02) multiplier = 0.8; // Sparse
    else if (conceptDensity > 0.05) multiplier = 1.2; // Dense (Slightly reduced from 1.3)

    // 3. Section Multiplier
    const rawSectionMultiplier = 1 + (sectionCount * 0.05);
    const sectionMultiplier = Math.min(1.5, rawSectionMultiplier);

    // Antrenman Quota: Base * Multipliers
    const antrenman = Math.ceil(baseCount * multiplier * sectionMultiplier);

    // Archive & Simulation Quotas: 25% of Antrenman each
    const arsiv = Math.ceil(antrenman * 0.25);
    const deneme = Math.ceil(antrenman * 0.25);

    return {
        total: antrenman + arsiv + deneme,
        antrenman,
        arsiv,
        deneme,
        // Aliases for compatibility with legacy code
        antrenmanCount: antrenman,
        arsivCount: arsiv,
        denemeCount: deneme,
        baseCount: Math.round(baseCount * 100) / 100,
        multiplier,
        conceptDensity: Math.round(conceptDensity * 10000) / 10000,
    };
}
