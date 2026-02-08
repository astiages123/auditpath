/**
 * Quota Calculation Logic
 *
 * Scientific Master Set (Bilimsel Master Set)
 * Dynamic quota calculation based on meaningful word count and density score.
 */

/**
 * Calculate dynamic quota based on meaningful word count and density score.
 *
 * Logic:
 * 1. Base = meaningfulWordCount / 45
 * 2. Multiplier:
 *    - densityScore > 0.55 => 1.2x
 *    - densityScore < 0.25 => 0.8x
 *    - else => 1.0x
 * 3. Clamp result: Min 3, No Upper Limit.
 */
export function calculateDynamicQuota(
    meaningfulWordCount: number,
    densityScore: number,
): {
    total: number;
    antrenman: number;
    arsiv: number;
    deneme: number;
    // Telemetry / Debug info
    baseCount: number;
    multiplier: number;
} {
    // 1. Base Calculation
    const safeWordCount = Math.max(0, meaningfulWordCount);
    // Base = meaningfulWordCount / 45
    const rawBase = safeWordCount / 45;

    // 2. Multiplier Calculation based on Density Score
    let multiplier = 1.0;
    if (densityScore > 0.55) {
        multiplier = 1.2;
    } else if (densityScore < 0.25) {
        multiplier = 0.8;
    }

    // 3. Final Calculation & Clamping
    const adjustedCount = rawBase * multiplier;
    // Lower bound 3, No Upper Bound
    const finalCount = Math.max(3, Math.round(adjustedCount));

    // Distribute quota
    // Antrenman is the main target.
    const antrenman = finalCount;
    const arsiv = Math.ceil(antrenman * 0.25);
    const deneme = Math.ceil(antrenman * 0.25);

    return {
        total: antrenman + arsiv + deneme,
        antrenman,
        arsiv,
        deneme,
        baseCount: rawBase,
        multiplier,
    };
}
