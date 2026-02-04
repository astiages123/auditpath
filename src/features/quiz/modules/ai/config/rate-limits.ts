/**
 * AI Model Rate Limit Configurations
 * Defines quota and rate limits for different providers and models.
 */

export const RATE_LIMITS = {
    // Mapping Model
    "moonshotai/kimi-k2-instruct-0905": {
        RPM: 60,
        TPM: 10000,
        RPD: 1000,
        TPD: 300000,
    },
    // Validation Model
    "qwen-3-32b": {
        RPM: 30, // 30 req/min
        TPM: 64000, // 64k tokens/min
        // Daily limits are high enough to be ignored for immediate throttling
        RPD: 14400,
        TPD: 1000000,
    },
    // Generation Model
    "qwen-3-235b-a22b-instruct-2507": {
        RPM: 30,
        TPM: 64000,
        RPD: 1440,
        TPD: 1000000,
    },
} as const;

export type ModelName = keyof typeof RATE_LIMITS;

/**
 * Calculates strict delay between requests to respect RPM
 * Returns milliseconds to wait
 */
// getMinRequestInterval removed - Use rateLimiter.waitForSlot(model) instead.
