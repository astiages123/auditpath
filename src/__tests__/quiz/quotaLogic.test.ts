import { describe, expect, it } from 'vitest';
import { calculateQuotaStatus } from '@/features/quiz/logic/quizCalculations';

describe('quizCalculations - calculateQuotaStatus', () => {
  it('should calculate quota status correctly for default 250 limit', () => {
    const status = calculateQuotaStatus(50, 250);
    expect(status.total).toBe(250);
    expect(status.used).toBe(50);
    expect(status.remaining).toBe(200);
    expect(status.isLimitReached).toBe(false);
    expect(status.percentage).toBe(20);
  });

  it('should mark as exceeded when used equals limit', () => {
    const status = calculateQuotaStatus(250, 250);
    expect(status.isLimitReached).toBe(true);
    expect(status.remaining).toBe(0);
    expect(status.percentage).toBe(100);
  });

  it('should mark as exceeded when used exceeds limit', () => {
    const status = calculateQuotaStatus(260, 250);
    expect(status.isLimitReached).toBe(true);
    expect(status.remaining).toBe(0);
    expect(status.percentage).toBe(104);
  });

  it('should handle zero limit gracefully', () => {
    const status = calculateQuotaStatus(10, 0);
    expect(status.total).toBe(0);
    expect(status.isLimitReached).toBe(true);
    expect(status.percentage).toBe(0);
  });
});
