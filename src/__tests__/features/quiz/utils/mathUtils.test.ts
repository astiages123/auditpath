import { describe, expect, it } from 'vitest';
import { cleanMathContent, shuffle } from '@/features/quiz/utils/mathUtils';

describe('cleanMathContent', () => {
  it('should escape percentage signs in math mode', () => {
    expect(cleanMathContent('$50%$')).toBe('$50\\%$');
  });

  it('should not escape already escaped percentage signs', () => {
    expect(cleanMathContent('$50\\%$')).toBe('$50\\%$');
  });

  it('should escape multiple percentage signs', () => {
    expect(cleanMathContent('$10% + 20% = 30%$')).toBe(
      '$10\\% + 20\\% = 30\\%$'
    );
  });

  it('should remove image patterns', () => {
    expect(cleanMathContent('Check this (image.webp) out.')).toBe(
      'Check this  out.'
    );
  });

  it('should remove [GÖRSEL: X] patterns', () => {
    expect(cleanMathContent('Soru [GÖRSEL: 1] için hangisi doğrudur?')).toBe(
      'Soru  için hangisi doğrudur?'
    );
  });

  it('should normalize newlines', () => {
    expect(cleanMathContent('First\n\n\nSecond')).toBe('First\n\nSecond');
  });

  it('should format numbers with dots for thousands', () => {
    expect(cleanMathContent('Sonuç 1000 000 çıkıyor.')).toBe(
      'Sonuç 1.000.000 çıkıyor.'
    );
  });

  it('should return empty string for null/undefined/empty input', () => {
    expect(cleanMathContent(null)).toBe('');
    expect(cleanMathContent(undefined)).toBe('');
    expect(cleanMathContent('')).toBe('');
  });
});

describe('shuffle', () => {
  it('should return an array with the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect(result.sort()).toEqual(input.sort());
  });

  it('should not modify the original array', () => {
    const input = [1, 2, 3];
    const original = [...input];
    shuffle(input);
    expect(input).toEqual(original);
  });
});
