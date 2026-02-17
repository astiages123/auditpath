/**
 * Rank system types
 */
export interface Rank {
    id: string;
    name: string;
    minPercentage: number;
    color: string;
    motto: string;
    imagePath: string;
    order: number;
}

export interface UnlockedAchievement {
    achievement_id: string;
    unlockedAt: string;
}

export interface StreakMilestones {
    maxStreak: number;
    first7StreakDate: string | null; // İlk kez 7+ günlük streak tamamlandığı gün
}
