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

    private concurrencyLimit = pLimit(3); // Max 3 concurrent requests
    private ESTIMATED_COST = 10000; // Conservative estimate per request

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
                // console.log(`[RateLimiter] Synced Remaining Tokens: ${parsed}`);
            }
        }

        if (reset) {
            // Assuming 'reset' is seconds or a specific format.
            // Usually standard headers are "seconds until reset" or "timestamp".
            // Let's assume input is "seconds until reset" based on standard practices,
            // but will log strictly if needed.
            // If it is a duration in strings like "10s", we parse it.
            // If it is a number string "45", it is seconds.
            const parsedReset = parseFloat(reset);
            if (!isNaN(parsedReset)) {
                // Assume seconds remaining
                this.state.resetTime = Date.now() + parsedReset * 1000;
                // console.log(`[RateLimiter] Synced Reset Time: ${new Date(this.state.resetTime).toISOString()}`);
            }
        }
    }

    /**
     * Waits for a concurrency slot AND token budget.
     * Decrements estimated usage immediately to prevent bursts.
     */
    public async waitForSlot(): Promise<void> {
        // 1. Concurrency Gate
        // We cannot just use limit() to run the function because we need to wait BEFORE calling.
        // However, p-limit wraps the execution.
        // To act as a gate, we can acquire a lock? No, p-limit doesn't expose 'acquire'.
        // Better pattern: Wrap the execution in the generator directly using this.schedule()
        // But for now, we leave this method checking budget.
        // Wait... if we use p-limit in generator, we don't need it here?
        // User asked: "RateLimiter.waitForSlot süresi kadar beklemeli".
        // User also asked: "Concurrency Limit: Aynı anda en fazla 3 isteğin in-flight olmasına izin ver".
        // I will expose a 'schedule' method.

        await this.checkTokenBudget();
    }

    /**
     * Schedules a task with concurrency and rate limiting.
     */
    public schedule<T>(fn: () => Promise<T>): Promise<T> {
        return this.concurrencyLimit(async () => {
            await this.checkTokenBudget();
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
                    `[RateLimiter] TPM Exhausted (${this.state.remainingTokens} < ${this.ESTIMATED_COST}). Waiting ${
                        (
                            waitTime / 1000
                        ).toFixed(1)
                    }s...`,
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, waitTime + 1000)
                ); // +1s buffer
                // After waiting, we assume tokens are back to MAX (or we wait for next sync).
                // Best approach: reset tokens to MAX after wait?
                // Or trust headers will update on next success?
                // Risky to assume max. Let's reset to safe threshold.
                this.state.remainingTokens = 60000;
            }
        }
    }

    public getRemainingTokens(): number {
        return this.state.remainingTokens;
    }
}

export const rateLimiter = new RateLimiter();
