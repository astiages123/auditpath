import pLimit from "p-limit";

interface RateLimitState {
    remainingTokens: number;
    resetTime: number; // Unix Timestamp (ms)
}

/**
 * Smart Rate Limiter for Cerebras
 * Manages TPM (Tokens Per Minute), Header Sync, and Concurrency.
 */
class RateLimiter {
    // Cerebras Limits: 64k TPM
    private state: RateLimitState = {
        remainingTokens: 60000, // Safe start
        resetTime: 0,
    };

    private concurrencyLimit = pLimit(1); // Max 1 concurrent request
    private ESTIMATED_COST = 10000; // Conservative estimate per request
    private lastRequestTime = 0; // Track last request timestamp
    private MIN_REQUEST_INTERVAL = 3000; // Minimum 3 seconds between requests

    /**
     * Syncs internal state with actual API headers
     */
    public syncHeaders(headers: Headers) {
        const remaining = headers.get("x-ratelimit-remaining-tokens-minute");
        const reset = headers.get("x-ratelimit-reset-tokens-minute");

        if (remaining) {
            const parsed = parseInt(remaining, 10);
            if (!isNaN(parsed)) {
                this.state.remainingTokens = parsed;
                console.log(`[RateLimiter] 📊 Kalan token: ${parsed}`);
            }
        }

        if (reset) {
            const parsedReset = parseFloat(reset);
            if (!isNaN(parsedReset)) {
                this.state.resetTime = Date.now() + parsedReset * 1000;
            }
        }
    }

    /**
     * Waits for a concurrency slot AND token budget.
     */
    public async waitForSlot(): Promise<void> {
        await this.checkTokenBudget();
    }

    /**
     * Schedules a task with concurrency and rate limiting.
     */
    public schedule<T>(fn: () => Promise<T>): Promise<T> {
        return this.concurrencyLimit(async () => {
            // Enforce minimum interval between requests
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;

            if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
                const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
                console.log(
                    `[RateLimiter] ⏳ ${
                        (delay / 1000).toFixed(1)
                    }s bekleniyor...`,
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
            }

            await this.checkTokenBudget();

            // Update last request time
            this.lastRequestTime = Date.now();

            // Pessimistic consumption
            this.state.remainingTokens -= this.ESTIMATED_COST;
            return await fn();
        });
    }

    private async checkTokenBudget() {
        if (this.state.remainingTokens < this.ESTIMATED_COST) {
            const now = Date.now();
            const waitTime = Math.max(0, this.state.resetTime - now);

            if (
                waitTime > 0 && this.state.remainingTokens < this.ESTIMATED_COST
            ) {
                console.warn(
                    `[RateLimiter] ⚠️ TPM Exhausted (${this.state.remainingTokens} < ${this.ESTIMATED_COST}). Waiting ${
                        (waitTime / 1000).toFixed(1)
                    }s...`,
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, waitTime + 1000)
                );
                this.state.remainingTokens = 60000;
            }
        }
    }

    public getRemainingTokens(): number {
        return this.state.remainingTokens;
    }
}

export const rateLimiter = new RateLimiter();
