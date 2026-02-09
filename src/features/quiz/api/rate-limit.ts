/**
 * Rate Limiter (Production)
 *
 * Implements p-limit (concurrency: 1) and Token Budget logic
 * for Cerebras and Mimo providers.
 */

import pLimit from "p-limit";
import { type LLMProvider } from "../core/types";

interface Budget {
    remaining: number;
    reset: number;
}

export class RateLimitService {
    // Shared queue across all providers (concurrency: 1 as per requirements)
    private limit = pLimit(1);

    // Budget tracking per provider
    private budgets: Map<LLMProvider, Budget> = new Map();

    /**
     * Parse and sync rate limit headers from API response
     */
    syncHeaders(headers: Headers, provider: LLMProvider) {
        // Look for X-RateLimit-* or similar headers
        // Cerebras uses: x-ratelimit-remaining-tokens, x-ratelimit-reset-tokens
        // Mimo follows similar pattern for tokens/requests

        const remaining = headers.get("x-ratelimit-remaining-tokens") ||
            headers.get("x-ratelimit-remaining");

        const reset = headers.get("x-ratelimit-reset-tokens") ||
            headers.get("x-ratelimit-reset");

        if (remaining) {
            const resetVal = reset ? parseFloat(reset) : 60;
            // reset header is often in seconds (for Cerebras) or timestamp
            // We assume seconds if < 1000000, otherwise timestamp
            const resetTime = resetVal < 1000000
                ? Date.now() + (resetVal * 1000)
                : resetVal;

            this.budgets.set(provider, {
                remaining: parseInt(remaining, 10),
                reset: resetTime,
            });

            if (parseInt(remaining, 10) < 500) {
                console.warn(
                    `[RateLimit] Critical: ${provider} budget low (${remaining} tokens). Reset in ${
                        Math.ceil((resetTime - Date.now()) / 1000)
                    }s`,
                );
            }
        }
    }

    /**
     * Schedule a task through the central queue
     */
    async schedule<T>(
        task: () => Promise<T>,
        provider: LLMProvider,
    ): Promise<T> {
        return this.limit(async () => {
            const budget = this.budgets.get(provider);

            // If budget is exhausted, wait until reset
            if (budget && budget.remaining <= 0) {
                const waitTime = budget.reset - Date.now();
                if (waitTime > 0) {
                    console.info(
                        `[RateLimit] Waiting ${
                            Math.ceil(waitTime / 1000)
                        }s for ${provider} budget reset...`,
                    );
                    await new Promise((resolve) =>
                        setTimeout(resolve, waitTime)
                    );
                }
            }

            return task();
        });
    }
}

export const rateLimiter = new RateLimitService();
