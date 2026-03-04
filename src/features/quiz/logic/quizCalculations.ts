import { DAILY_QUOTA, MASTERY_THRESHOLD } from '../utils/constants';
import { type QuizResults, type TestResultSummary } from '../types';

// === SECTION: Score & Mastery Calculations ===

/**
 * Başarı yüzdesini hesaplar.
 * @param correct - Doğru sayısı
 * @param total - Toplam soru sayısı
 * @returns Yüzdelik başarı (0-100)
 */
export const calculatePercentage = (correct: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
};

/**
 * Toplam ustalık puanını hesaplar.
 * @param correct - Doğru sayısı
 * @param total - Toplam soru sayısı
 * @returns Ustalık puanı
 */
export const calculateMasteryScore = (
  correct: number,
  total: number
): number => {
  return calculatePercentage(correct, total);
};

/**
 * Verilen skorun ustalık eşiğini geçip geçmediğini kontrol eder.
 * @param score - Kontrol edilecek skor
 * @returns Eşik geçildiyse true
 */
export const isMastered = (score: number): boolean => {
  return score >= MASTERY_THRESHOLD;
};

/**
 * Quiz sonuçlarına göre genel test özetini hesaplar.
 */
export function calculateTestResults(
  correct: number,
  incorrect: number,
  blank: number,
  timeSpentMs: number
): TestResultSummary {
  const total = correct + incorrect + blank;
  const percentage = calculatePercentage(correct, total);

  const masteryScore =
    total > 0
      ? Math.round(((correct * 1.0 + incorrect * 0.2) / total) * 100)
      : 0;

  const pendingReview = incorrect + blank;

  const totalSeconds = Math.floor(timeSpentMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const totalTimeFormatted = `${minutes}:${seconds
    .toString()
    .padStart(2, '0')}`;

  return { percentage, masteryScore, pendingReview, totalTimeFormatted };
}

/**
 * Quiz başlangıcında boş sonuç objesi oluşturur.
 */
export function calculateInitialResults(): QuizResults {
  return {
    correct: 0,
    incorrect: 0,
    blank: 0,
    totalTimeMs: 0,
  };
}

/**
 * Mevcut sonuçları yeni bir cevapla günceller.
 */
export function updateResults(
  prev: QuizResults,
  type: 'correct' | 'incorrect' | 'blank',
  timeSpentMs: number
): QuizResults {
  const next = { ...prev };

  if (type === 'correct') next.correct++;
  else if (type === 'incorrect') next.incorrect++;
  else next.blank++;

  next.totalTimeMs += timeSpentMs;

  return next;
}

// === SECTION: Quota & Limit Calculations ===

/**
 * Konsept sayısına göre antrenman ve deneme kotalarını hesaplar.
 */
export function calculateQuotas(concepts: { length: number }): {
  antrenman: number;
  deneme: number;
} {
  const count = concepts.length;
  return {
    antrenman: count * 3,
    deneme: Math.ceil(count / 2),
  };
}

/**
 * Günlük kota doluluk oranını hesaplar.
 */
export const calculateQuotaStatus = (usedCount: number) => {
  const remaining = Math.max(0, DAILY_QUOTA - usedCount);
  const percentage = calculatePercentage(usedCount, DAILY_QUOTA);

  return {
    used: usedCount,
    total: DAILY_QUOTA,
    remaining,
    percentage,
    isLimitReached: usedCount >= DAILY_QUOTA,
  };
};
