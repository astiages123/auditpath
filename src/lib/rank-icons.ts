import { Briefcase, Star, Shield, Crown, type LucideIcon } from "lucide-react";
// import { RANKS as DB_RANKS } from "./constants";

// Re-export RANKS from constants for backward compatibility or ease of use
export { RANKS as rankThresholds } from "./constants";

// Rank name to Lucide icon mapping
export const rankIcons: Record<string, LucideIcon> = {
    "Sürgün": Briefcase,
    "Yazıcı": Star,
    "Sınır Muhafızı": Shield,
    "Yüce Bilgin": Crown,
};

// Get the icon component for a rank name
export function getRankIcon(rankName: string | null | undefined): LucideIcon {
    if (!rankName) return Briefcase;
    return rankIcons[rankName] || Briefcase;
}

export { RANKS, type Rank } from "./constants";
