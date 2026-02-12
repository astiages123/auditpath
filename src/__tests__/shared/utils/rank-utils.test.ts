import { describe, expect, it } from 'vitest';
import {
  getNextRank,
  getRankForPercentage,
  RANKS,
} from '@/shared/lib/core/utils/rank-utils';

describe('rank-utils', () => {
  describe('getRankForPercentage', () => {
    it('should return the lowest rank for 0%', () => {
      const rank = getRankForPercentage(0);
      expect(rank.id).toBe('1');
      expect(rank.name).toBe('Sürgün');
    });

    it('should return Rank 2 (Yazıcı) for 30%', () => {
      const rank = getRankForPercentage(30);
      expect(rank.id).toBe('2');
      expect(rank.name).toBe('Yazıcı');
    });

    it('should return Rank 3 (Sınır Muhafızı) for 60%', () => {
      const rank = getRankForPercentage(60);
      expect(rank.id).toBe('3');
      expect(rank.name).toBe('Sınır Muhafızı');
    });

    it('should return Rank 4 (Yüce Bilgin) for 90%', () => {
      const rank = getRankForPercentage(90);
      expect(rank.id).toBe('4');
      expect(rank.name).toBe('Yüce Bilgin');
    });

    it('should stay at highest rank for 100%', () => {
      const rank = getRankForPercentage(100);
      expect(rank.id).toBe('4');
    });

    it('should handle edges correctly (25% should be yazıcı)', () => {
      expect(getRankForPercentage(24).id).toBe('1');
      expect(getRankForPercentage(25).id).toBe('2');
    });
  });

  describe('getNextRank', () => {
    it('should return rank 2 after rank 1', () => {
      const next = getNextRank('1');
      expect(next?.id).toBe('2');
    });

    it('should return null after the highest rank', () => {
      const lastRankId = RANKS[RANKS.length - 1].id;
      expect(getNextRank(lastRankId)).toBeNull();
    });

    it('should return null for invalid rank id', () => {
      expect(getNextRank('non-existent')).toBeNull();
    });
  });
});
