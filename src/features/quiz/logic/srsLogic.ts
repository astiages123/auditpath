import {
  type QuizResponseType,
  type SubmissionResult,
} from '@/features/quiz/types';

// === SECTION: Rep Count & Status ===

/**
 * Bir soruya verilen yanıta göre yeni rep_count ve status hesaplar.
 * rep=0 → active, rep=1|2 → reviewing, rep=3 → mastered
 */
export function calculateRepResult(
  repCount: number,
  isCorrect: boolean
): { newRepCount: number; newStatus: 'active' | 'reviewing' | 'mastered' } {
  const newRepCount = isCorrect
    ? Math.min(repCount + 1, 3)
    : Math.max(repCount - 1, 0);

  let newStatus: 'active' | 'reviewing' | 'mastered';
  if (newRepCount === 0) {
    newStatus = 'active';
  } else if (newRepCount === 3) {
    newStatus = 'mastered';
  } else {
    newStatus = 'reviewing';
  }

  return { newRepCount, newStatus };
}

// === SECTION: Next Session ===

/**
 * Rep durumuna göre bir sonraki tekrar oturumunu hesaplar.
 * gaps[repCount] = kaç oturum sonra tekrar gösterilsin
 */
export function calculateNextSession(
  currentSession: number,
  newRepCount: number
): number {
  const gaps = [0, 1, 2, 5, 5];
  return currentSession + (gaps[newRepCount] ?? 5);
}

// === SECTION: Score Change ===

/**
 * Yanıt tipine göre skor değişimini hesaplar.
 * Skor 0-100 aralığında tutulur.
 */
export function calculateScoreChange(
  responseType: QuizResponseType,
  currentScore: number
): { delta: number; newScore: number } {
  const deltas: Record<QuizResponseType, number> = {
    correct: 10,
    incorrect: -5,
    blank: -2,
  };

  const delta = deltas[responseType];
  const newScore = Math.max(0, Math.min(100, currentScore + delta));

  return { delta, newScore };
}

// === SECTION: Quiz Result ===

/**
 * Bir soru yanıtının tüm etkisini (SRS + skor) hesaplar ve SubmissionResult döner.
 */
export function calculateQuizResult(
  currentStatus: { rep_count: number } | null,
  responseType: QuizResponseType,
  currentScore: number,
  sessionNumber: number
): SubmissionResult {
  const isCorrect = responseType === 'correct';

  const repResult = calculateRepResult(
    currentStatus?.rep_count ?? 0,
    isCorrect
  );

  const nextReviewSession = calculateNextSession(
    sessionNumber,
    repResult.newRepCount
  );

  const scoreResult = calculateScoreChange(responseType, currentScore);

  return {
    isCorrect,
    scoreDelta: scoreResult.delta,
    newMastery: scoreResult.newScore,
    newStatus: repResult.newStatus,
    nextReviewSession,
    newRepCount: repResult.newRepCount,
  };
}
