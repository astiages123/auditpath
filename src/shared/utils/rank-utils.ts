import { RANKS } from '@/config/constants';
import type { Rank } from '@/shared/types';

// Re-export type for convenience
export type { Rank } from '@/shared/types';

// Re-export RANKS constant
export { RANKS };

/**
 * Get the rank for a given progress percentage.
 *
 * @param percentage Progress percentage (0-100)
 * @returns The appropriate rank for the percentage
 */
export function getRankForPercentage(percentage: number): Rank {
  // Sort by minPercentage descending to find the highest matching rank
  const sortedRanks = [...RANKS].sort(
    (a, b) => b.minPercentage - a.minPercentage
  );
  for (const rank of sortedRanks) {
    if (percentage >= rank.minPercentage) {
      return rank;
    }
  }
  return RANKS[0]; // Fallback
}

/**
 * Get the next rank after the current rank.
 *
 * @param currentRankId Current rank ID
 * @returns Next rank or null if already at max rank
 */
export function getNextRank(currentRankId: string): Rank | null {
  const currentIndex = RANKS.findIndex((r) => r.id === currentRankId);
  if (currentIndex === -1 || currentIndex === RANKS.length - 1) return null;
  return RANKS[currentIndex + 1];
}
