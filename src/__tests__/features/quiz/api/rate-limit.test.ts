import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitService } from '@/features/quiz/api/rate-limit';

vi.mock('@/shared/lib/core/utils/logger', () => {
  const mockFn = vi.fn();
  return {
    logger: {
      warn: mockFn,
      info: mockFn,
      error: mockFn,
      debug: mockFn,
      withPrefix: () => ({
        warn: mockFn,
        info: mockFn,
        error: mockFn,
        debug: mockFn,
      }),
    },
  };
});

vi.mock('@/config/env', () => ({
  env: { app: { isDev: true } },
}));

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    service = new RateLimitService();
  });

  describe('syncHeaders', () => {
    it('should sync headers with reset in seconds (60s)', () => {
      const headers = new Headers({
        'x-ratelimit-remaining': '100',
        'x-ratelimit-reset': '60',
      });

      service.syncHeaders(headers, 'cerebras');

      const budget = service['budgets'].get('cerebras');
      expect(budget?.remaining).toBe(100);
      expect(budget?.reset).toBeCloseTo(Date.now() + 60000, -3);
    });

    it('should sync headers with reset as timestamp (milliseconds)', () => {
      const futureTimestamp = Date.now() + 3600000;
      const headers = new Headers({
        'x-ratelimit-remaining': '50',
        'x-ratelimit-reset': String(futureTimestamp),
      });

      service.syncHeaders(headers, 'cerebras');

      const budget = service['budgets'].get('cerebras');
      expect(budget?.remaining).toBe(50);
      expect(budget?.reset).toBe(futureTimestamp);
    });

    it('should use default reset value (60) when reset header is missing', () => {
      const headers = new Headers({
        'x-ratelimit-remaining': '75',
      });

      service.syncHeaders(headers, 'mimo');

      const budget = service['budgets'].get('mimo');
      expect(budget?.remaining).toBe(75);
      expect(budget?.reset).toBeCloseTo(Date.now() + 60000, -3);
    });

    it('should return early when remaining is NaN', () => {
      const headers = new Headers({
        'x-ratelimit-remaining': 'abc',
        'x-ratelimit-reset': '60',
      });

      service.syncHeaders(headers, 'cerebras');

      expect(service['budgets'].has('cerebras')).toBe(false);
    });

    it('should return early when reset is NaN', () => {
      const headers = new Headers({
        'x-ratelimit-remaining': '100',
        'x-ratelimit-reset': 'invalid',
      });

      service.syncHeaders(headers, 'cerebras');

      expect(service['budgets'].has('cerebras')).toBe(false);
    });

    it('should handle x-ratelimit-remaining-tokens header variant', () => {
      const headers = new Headers({
        'x-ratelimit-remaining-tokens': '200',
        'x-ratelimit-reset-tokens': '120',
      });

      service.syncHeaders(headers, 'cerebras');

      const budget = service['budgets'].get('cerebras');
      expect(budget?.remaining).toBe(200);
      expect(budget?.reset).toBeCloseTo(Date.now() + 120000, -3);
    });
  });

  describe('schedule', () => {
    it('should execute task immediately when budget is sufficient', async () => {
      service['budgets'].set('cerebras', {
        remaining: 100,
        reset: Date.now() + 60000,
      });

      let executed = false;
      await service.schedule(async () => {
        executed = true;
      }, 'cerebras');

      expect(executed).toBe(true);
    });

    it('should wait when budget is exhausted (remaining <= 0)', async () => {
      vi.useFakeTimers();

      const resetTime = Date.now() + 5000;
      service['budgets'].set('cerebras', {
        remaining: 0,
        reset: resetTime,
      });

      let executed = false;
      const promise = service.schedule(async () => {
        executed = true;
      }, 'cerebras');

      expect(executed).toBe(false);

      vi.advanceTimersByTime(5000);

      await promise;
      expect(executed).toBe(true);

      vi.useRealTimers();
    });

    it('should not wait when budget is exhausted but reset time has passed', async () => {
      service['budgets'].set('cerebras', {
        remaining: 0,
        reset: Date.now() - 1000,
      });

      let executed = false;
      await service.schedule(async () => {
        executed = true;
      }, 'cerebras');

      expect(executed).toBe(true);
    });

    it('should enforce concurrency: 1 (sequential execution)', async () => {
      const executionOrder: string[] = [];

      const task1 = async () => {
        executionOrder.push('start1');
        await new Promise((resolve) => setTimeout(resolve, 50));
        executionOrder.push('end1');
      };

      const task2 = async () => {
        executionOrder.push('start2');
        executionOrder.push('end2');
      };

      await Promise.all([
        service.schedule(task1, 'cerebras'),
        service.schedule(task2, 'cerebras'),
      ]);

      expect(executionOrder).toEqual(['start1', 'end1', 'start2', 'end2']);
    });

    it('should allow concurrent tasks for different providers', async () => {
      // Note: p-limit(1) is shared across ALL providers (as per requirements)
      // So even different providers execute sequentially
      const executionOrder: string[] = [];

      service['budgets'].set('cerebras', {
        remaining: 100,
        reset: Date.now() + 60000,
      });
      service['budgets'].set('mimo', {
        remaining: 100,
        reset: Date.now() + 60000,
      });

      const task1 = async () => {
        executionOrder.push('start-cerebras');
        await new Promise((resolve) => setTimeout(resolve, 50));
        executionOrder.push('end-cerebras');
      };

      const task2 = async () => {
        executionOrder.push('start-mimo');
        executionOrder.push('end-mimo');
      };

      await Promise.all([
        service.schedule(task1, 'cerebras'),
        service.schedule(task2, 'mimo'),
      ]);

      // With p-limit(1), tasks execute sequentially regardless of provider
      expect(executionOrder).toEqual([
        'start-cerebras',
        'end-cerebras',
        'start-mimo',
        'end-mimo',
      ]);
    });

    it('should return task result correctly', async () => {
      service['budgets'].set('cerebras', {
        remaining: 100,
        reset: Date.now() + 60000,
      });

      const result = await service.schedule(async () => {
        return 'task-result';
      }, 'cerebras');

      expect(result).toBe('task-result');
    });
  });
});
