import { getRankForPercentage, Rank, RANKS } from '@/config/constants';

// Re-export from config for convenience
export type { Rank } from '@/config/constants';
export { getRankForPercentage, RANKS };

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
