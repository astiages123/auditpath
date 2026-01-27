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
    const growthRate = 1.1;
    const linearGrowth = (Math.max(0, wordCount) / 100) * growthRate;
    const rawBase = MIN_QUOTA + linearGrowth;
    const baseCount = Math.min(MAX_QUOTA, rawBase);

    const safeWordCount = wordCount > 0 ? wordCount : 1;
    const conceptDensity = conceptCount / safeWordCount;

    let multiplier = 1.0;
    if (conceptDensity < 0.02) multiplier = 0.8; // Sparse
    else if (conceptDensity > 0.05) multiplier = 1.3; // Dense

    // 3. Section Multiplier
    const rawSectionMultiplier = 1 + (sectionCount * 0.05);
    const sectionMultiplier = Math.min(1.5, rawSectionMultiplier);

    const antrenman = Math.ceil(baseCount * multiplier * sectionMultiplier);
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
