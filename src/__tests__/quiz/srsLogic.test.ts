import { describe, expect, it } from 'vitest';
import {
  calculateNextSession,
  calculateRepResult,
  calculateScoreChange,
} from '@/features/quiz/logic/srsLogic';

// === calculateRepResult ===

describe('calculateRepResult', () => {
  it('active (rep=0) + doğru → reviewing (rep=1)', () => {
    const result = calculateRepResult(0, true);
    expect(result.newRepCount).toBe(1);
    expect(result.newStatus).toBe('reviewing');
  });

  it('reviewing (rep=1) + doğru → reviewing (rep=2)', () => {
    const result = calculateRepResult(1, true);
    expect(result.newRepCount).toBe(2);
    expect(result.newStatus).toBe('reviewing');
  });

  it('reviewing (rep=2) + doğru → mastered (rep=3)', () => {
    const result = calculateRepResult(2, true);
    expect(result.newRepCount).toBe(3);
    expect(result.newStatus).toBe('mastered');
  });

  it('mastered (rep=3) + doğru → mastered kalır (rep=3, üst sınır)', () => {
    const result = calculateRepResult(3, true);
    expect(result.newRepCount).toBe(3);
    expect(result.newStatus).toBe('mastered');
  });

  it('active (rep=0) + yanlış → active kalır (rep=0, alt sınır)', () => {
    const result = calculateRepResult(0, false);
    expect(result.newRepCount).toBe(0);
    expect(result.newStatus).toBe('active');
  });

  it('reviewing (rep=1) + yanlış → active (rep=0)', () => {
    const result = calculateRepResult(1, false);
    expect(result.newRepCount).toBe(0);
    expect(result.newStatus).toBe('active');
  });

  it('reviewing (rep=2) + yanlış → reviewing (rep=1)', () => {
    const result = calculateRepResult(2, false);
    expect(result.newRepCount).toBe(1);
    expect(result.newStatus).toBe('reviewing');
  });

  it('mastered (rep=3) + yanlış → reviewing (rep=2)', () => {
    const result = calculateRepResult(3, false);
    expect(result.newRepCount).toBe(2);
    expect(result.newStatus).toBe('reviewing');
  });
});

// === calculateNextSession ===

describe('calculateNextSession', () => {
  it('rep=0 → current + 0', () => {
    expect(calculateNextSession(5, 0)).toBe(5);
  });

  it('rep=1 → current + 1', () => {
    expect(calculateNextSession(5, 1)).toBe(6);
  });

  it('rep=2 → current + 2', () => {
    expect(calculateNextSession(5, 2)).toBe(7);
  });

  it('rep=3 → current + 5', () => {
    expect(calculateNextSession(5, 3)).toBe(10);
  });
});

// === calculateScoreChange ===

describe('calculateScoreChange', () => {
  it('correct, score=50 → delta=+10, newScore=60', () => {
    const result = calculateScoreChange('correct', 50);
    expect(result.delta).toBe(10);
    expect(result.newScore).toBe(60);
  });

  it('incorrect, score=50 → delta=-5, newScore=45', () => {
    const result = calculateScoreChange('incorrect', 50);
    expect(result.delta).toBe(-5);
    expect(result.newScore).toBe(45);
  });

  it('blank, score=50 → delta=-2, newScore=48', () => {
    const result = calculateScoreChange('blank', 50);
    expect(result.delta).toBe(-2);
    expect(result.newScore).toBe(48);
  });

  it('correct, score=95 → newScore=100 (üst sınır)', () => {
    const result = calculateScoreChange('correct', 95);
    expect(result.newScore).toBe(100);
  });

  it('incorrect, score=3 → newScore=0 (alt sınır)', () => {
    const result = calculateScoreChange('incorrect', 3);
    expect(result.newScore).toBe(0);
  });
});
