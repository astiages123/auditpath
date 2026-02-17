import { Briefcase, Crown, type LucideIcon, Shield, Star } from 'lucide-react';

export type { Rank } from '@/types';
export { RANKS } from '@/utils/constants';

// Rank name to Lucide icon mapping
export const rankIcons: Record<string, LucideIcon> = {
  Sürgün: Briefcase,
  Yazıcı: Star,
  'Sınır Muhafızı': Shield,
  'Yüce Bilgin': Crown,
};

// Get the icon component for a rank name
export function getRankIcon(rankName: string | null | undefined): LucideIcon {
  if (!rankName) return Briefcase;
  return rankIcons[rankName] || Briefcase;
}
