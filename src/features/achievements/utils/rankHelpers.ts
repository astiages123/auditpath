import type { Rank } from '@/types/auth';
import { RANKS } from './constants';

/**
 * Rank helper functions.
 * Provides utilities for rank calculation and progression.
 */

/**
 * Get the rank for a given progress percentage.
 *
 * @param percentage Progress percentage (0-100)
 * @returns The appropriate rank for the percentage
 */
export function getRankForPercentage(percentage: number): Rank {
  const sortedRanks = [...RANKS].sort(
    (a, b) => b.minPercentage - a.minPercentage
  );
  for (const rank of sortedRanks) {
    if (percentage >= rank.minPercentage) {
      return rank;
    }
  }
  return RANKS[0];
}

/**
 * Get the next rank after the current rank.
 *
 * @param currentRankId Current rank ID
 * @returns Next rank or null if already at max rank
 */
export function getNextRank(currentRankId: string): Rank | null {
  const currentIndex = RANKS.findIndex((r: Rank) => r.id === currentRankId);
  if (currentIndex === -1 || currentIndex === RANKS.length - 1) return null;
  return RANKS[currentIndex + 1];
}
