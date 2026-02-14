import {
  formatTimeFromSeconds,
  formatDurationFromHours,
  formatDurationShort,
} from '@/shared/lib/utils/formatters';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('formatters', () => {
  describe('formatTimeFromSeconds', () => {
    it('should return 0dk for 0 seconds', () => {
      expect(formatTimeFromSeconds(0)).toBe('0dk');
    });

    it('should return 1dk for 60 seconds', () => {
      expect(formatTimeFromSeconds(60)).toBe('1dk');
    });

    it('should return 2dk for 120 seconds', () => {
      expect(formatTimeFromSeconds(120)).toBe('2dk');
    });

    it('should return 59dk for 3540 seconds', () => {
      expect(formatTimeFromSeconds(3540)).toBe('59dk');
    });

    it('should return 1sa 0dk for exactly 3600 seconds', () => {
      expect(formatTimeFromSeconds(3600)).toBe('1sa 0dk');
    });

    it('should return 1sa 0dk for 3660 seconds (rounds to 61 min = 1sa 1dk)', () => {
      expect(formatTimeFromSeconds(3660)).toBe('1sa 1dk');
    });

    it('should return 1sa 1dk for 3665 seconds', () => {
      expect(formatTimeFromSeconds(3665)).toBe('1sa 1dk');
    });

    it('should return 1sa 30dk for 5400 seconds', () => {
      expect(formatTimeFromSeconds(5400)).toBe('1sa 30dk');
    });

    it('should return 2sa 0dk for 7200 seconds', () => {
      expect(formatTimeFromSeconds(7200)).toBe('2sa 0dk');
    });

    it('should return 24sa 0dk for 86399 seconds (rounds to 1440 minutes)', () => {
      expect(formatTimeFromSeconds(86399)).toBe('24sa 0dk');
    });

    it('should handle rounding for 59 seconds (Math.round(0.983) = 1)', () => {
      expect(formatTimeFromSeconds(59)).toBe('1dk');
    });

    it('should handle rounding for 119 seconds (Math.round(1.983) = 2)', () => {
      expect(formatTimeFromSeconds(119)).toBe('2dk');
    });
  });

  describe('formatDurationFromHours', () => {
    it('should return 0 sa 0 dk for 0 hours', () => {
      expect(formatDurationFromHours(0)).toBe('0 sa 0 dk');
    });

    it('should return 0 sa 15 dk for 0.25 hours', () => {
      expect(formatDurationFromHours(0.25)).toBe('0 sa 15 dk');
    });

    it('should return 0 sa 30 dk for 0.5 hours', () => {
      expect(formatDurationFromHours(0.5)).toBe('0 sa 30 dk');
    });

    it('should return 0 sa 45 dk for 0.75 hours', () => {
      expect(formatDurationFromHours(0.75)).toBe('0 sa 45 dk');
    });

    it('should return 0 sa 59 dk for 0.99 hours', () => {
      expect(formatDurationFromHours(0.99)).toBe('0 sa 59 dk');
    });

    it('should return 1 sa 0 dk for 1 hour', () => {
      expect(formatDurationFromHours(1)).toBe('1 sa 0 dk');
    });

    it('should return 1 sa 30 dk for 1.5 hours', () => {
      expect(formatDurationFromHours(1.5)).toBe('1 sa 30 dk');
    });

    it('should return 2 sa 15 dk for 2.25 hours', () => {
      expect(formatDurationFromHours(2.25)).toBe('2 sa 15 dk');
    });

    it('should return 10 sa 7 dk for 10.123 hours (rounding)', () => {
      expect(formatDurationFromHours(10.123)).toBe('10 sa 7 dk');
    });

    it('should handle values between 0 and 0.25', () => {
      expect(formatDurationFromHours(0.1)).toBe('0 sa 6 dk');
    });
  });

  describe('formatDurationShort', () => {
    it('should return 0s 0d for 0 hours', () => {
      expect(formatDurationShort(0)).toBe('0s 0d');
    });

    it('should return 0s 15d for 0.25 hours', () => {
      expect(formatDurationShort(0.25)).toBe('0s 15d');
    });

    it('should return 0s 30d for 0.5 hours', () => {
      expect(formatDurationShort(0.5)).toBe('0s 30d');
    });

    it('should return 0s 45d for 0.75 hours', () => {
      expect(formatDurationShort(0.75)).toBe('0s 45d');
    });

    it('should return 1s 0d for 1 hour', () => {
      expect(formatDurationShort(1)).toBe('1s 0d');
    });

    it('should return 1s 30d for 1.5 hours', () => {
      expect(formatDurationShort(1.5)).toBe('1s 30d');
    });

    it('should return 2s 45d for 2.75 hours', () => {
      expect(formatDurationShort(2.75)).toBe('2s 45d');
    });

    it('should handle values between 0 and 0.25', () => {
      expect(formatDurationShort(0.1)).toBe('0s 6d');
    });

    it('should handle large values', () => {
      expect(formatDurationShort(24)).toBe('24s 0d');
    });
  });
});
