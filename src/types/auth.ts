// ===========================
// === BAŞARI (ACHIEVEMENT) TİPLERİ ===
// ===========================

/**
 * Kullanıcının açtığı bir başarıyı (achievement) temsil eder.
 */
export interface UnlockedAchievement {
  achievement_id: string;
  unlockedAt: string;
}

// ===========================
// === RÜTBE (RANK) TİPLERİ ===
// ===========================

/**
 * Kullanıcı rütbelerini (rank) ve özelliklerini tanımlar.
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

// ===========================
// === SERİ (STREAK) TİPLERİ ===
// ===========================

/**
 * Kullanıcının seri (streak) dönüm noktalarını temsil eder.
 */
export interface StreakMilestones {
  maxStreak: number;
  first7StreakDate: string | null;
}
