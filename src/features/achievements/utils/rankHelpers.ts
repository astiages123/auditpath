import type { Rank } from '@/types/auth';
import { RANKS } from './constants';

// ===========================
// === RANK RESOLUTION ===
// ===========================

/**
 * Retrieves the appropriate rank for a given progress percentage.
 *
 * @param percentage - The user's progress percentage (0-100)
 * @returns The Rank object corresponding to the progress
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
  return RANKS[0] as Rank;
}

/**
 * Retrieves the next progressive rank after the current one.
 *
 * @param currentRankId - The ID of the user's current rank
 * @returns The next Rank object, or null if the user is at the maximum rank
 */
export function getNextRank(currentRankId: string): Rank | null {
  const currentIndex = RANKS.findIndex((r: Rank) => r.id === currentRankId);
  if (currentIndex === -1 || currentIndex === RANKS.length - 1) return null;
  return RANKS[currentIndex + 1] as Rank;
}
