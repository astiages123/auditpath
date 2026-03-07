import { Briefcase, Crown, type LucideIcon, Shield, Star } from 'lucide-react';

export type { Rank } from '@/types/auth';

/**
 * A mapping of rank names to their corresponding display icons.
 */
export const rankIcons: Record<string, LucideIcon> = {
  Sürgün: Briefcase,
  Yazıcı: Star,
  'Sınır Muhafızı': Shield,
  'Yüce Bilgin': Crown,
};

/**
 * Retrieves the icon component associated with a rank name.
 * Falls back to a default icon (Briefcase) if the rank is not found.
 *
 * @param rankName - The display name of the rank
 * @returns The determined LucideIcon
 */
export function getRankIcon(rankName: string | null | undefined): LucideIcon {
  if (!rankName) return Briefcase;
  return rankIcons[rankName] || Briefcase;
}
