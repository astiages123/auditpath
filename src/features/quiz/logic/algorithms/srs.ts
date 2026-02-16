// --- Constants ---
const SESSION_GAPS = [1, 3, 7, 14, 30];
const SLOW_SUCCESS_INCREMENT = 0.5;

// --- SRS Logic ---

export function calculateShelfStatus(
  consecutiveSuccess: number,
  isCorrect: boolean,
  isFast: boolean
): {
  newStatus: 'archived' | 'pending_followup' | 'active';
  newSuccessCount: number;
} {
  if (!isCorrect) {
    const newSuccessCount = 0;
    return { newStatus: 'pending_followup', newSuccessCount };
  }

  const increment = isFast ? 1.0 : SLOW_SUCCESS_INCREMENT;
  const newSuccessCount = consecutiveSuccess + increment;

  if (newSuccessCount >= 3) {
    return { newStatus: 'archived', newSuccessCount };
  } else if (newSuccessCount >= 0.5) {
    return { newStatus: 'pending_followup', newSuccessCount };
  }

  return { newStatus: 'active', newSuccessCount };
}

export function calculateNextReviewSession(
  currentSession: number,
  successCount: number
): number {
  const adjustedSuccessCount = Math.max(1, successCount);
  const gapIndex = Math.floor(adjustedSuccessCount) - 1;
  const safeIndex = Math.max(0, Math.min(gapIndex, SESSION_GAPS.length - 1));
  const gap = SESSION_GAPS[safeIndex];
  return currentSession + gap;
}
