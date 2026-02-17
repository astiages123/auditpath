import {
  type ChunkMetadata,
  type QuizResponseType,
  type QuizResults,
  type SubmissionResult,
  type TestResultSummary,
} from "@/features/quiz/types";
import {
  calculateNextReviewSession,
  calculateShelfStatus,
} from "@/features/quiz/logic/algorithms/srs";
import {
  type BloomLevel,
  calculateTMax,
} from "@/features/quiz/logic/algorithms/strategy";

// --- Constants ---
const POINTS_CORRECT = 10;
const PENALTY_INCORRECT_FIRST = 5;
const PENALTY_BLANK_FIRST = 2;
const PENALTY_REPEATED = 10;

const MASTERY_WEIGHTS = {
  coverage: 0.4,
  score: 0.6,
} as const;

// --- Scoring Logic ---

export function calculateInitialResults(): QuizResults {
  return {
    correct: 0,
    incorrect: 0,
    blank: 0,
    totalTimeMs: 0,
  };
}

export function updateResults(
  currentResults: QuizResults,
  type: "correct" | "incorrect" | "blank",
  timeMs: number,
): QuizResults {
  return {
    ...currentResults,
    [type]: currentResults[type] + 1,
    totalTimeMs: currentResults.totalTimeMs + timeMs,
  };
}

export function calculateMastery(results: QuizResults, total: number): number {
  if (total === 0) return 0;
  return Math.round((results.correct / total) * 100);
}

export function isExcellenceAchieved(
  results: QuizResults,
  total: number,
): boolean {
  const mastery = calculateMastery(results, total);
  return mastery >= 90;
}

export function calculateTestResults(
  correct: number,
  incorrect: number,
  blank: number,
  timeSpentMs: number,
): TestResultSummary {
  const total = correct + incorrect + blank;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const masteryScore = total > 0
    ? Math.round(
      ((correct * 1.0 + incorrect * 0.2 + blank * 0.0) / total) * 100,
    )
    : 0;
  const pendingReview = incorrect + blank;
  const seconds = Math.floor(timeSpentMs / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  const mRemaining = m % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const totalTimeFormatted = `${pad(h)}:${pad(mRemaining)}:${pad(s)}`;

  return {
    percentage,
    masteryScore,
    pendingReview,
    totalTimeFormatted,
  };
}

export function calculateChunkMastery(
  totalQuestions: number,
  uniqueSolved: number,
  averageScore: number,
): number {
  if (totalQuestions === 0) return 0;
  const coverageRatio = Math.min(1, uniqueSolved / totalQuestions);
  const coverageScore = coverageRatio * (MASTERY_WEIGHTS.coverage * 100);
  const scoreComponent = averageScore * MASTERY_WEIGHTS.score;
  return Math.round(coverageScore + scoreComponent);
}

export interface ScoreChange {
  delta: number;
  newScore: number;
}

export function calculateScoreChange(
  responseType: QuizResponseType,
  currentScore: number,
  isRepeated: boolean = false,
): ScoreChange {
  let delta = 0;

  if (responseType === "correct") {
    delta = POINTS_CORRECT;
  } else {
    if (isRepeated) {
      delta = -PENALTY_REPEATED;
    } else {
      if (responseType === "incorrect") {
        delta = -PENALTY_INCORRECT_FIRST;
      } else if (responseType === "blank") {
        delta = -PENALTY_BLANK_FIRST;
      }
    }
  }

  const newScore = Math.max(0, Math.min(100, currentScore + delta));

  return {
    delta,
    newScore,
  };
}

// --- Submission Logic ---

export function calculateQuizResult(
  currentStatus: {
    consecutive_success: number;
    consecutive_fails: number;
  } | null,
  responseType: QuizResponseType,
  timeSpentMs: number,
  questionData: {
    bloom_level: string | null;
    chunk_id: string | null;
    usage_type?: string | null;
  } | null,
  chunkMetadata: {
    content: string | null;
    metadata: ChunkMetadata | null;
  } | null,
  masteryData: {
    mastery_score: number;
  } | null,
  uniqueSolvedCount: number,
  totalChunkQuestions: number,
  sessionNumber: number,
): SubmissionResult {
  const isCorrect = responseType === "correct";

  // Handle 'deneme' (mock) questions separately
  if (questionData?.usage_type === "deneme") {
    return {
      isCorrect,
      scoreDelta: 0,
      newMastery: masteryData?.mastery_score || 0,
      newStatus: calculateShelfStatus(
        currentStatus?.consecutive_success || 0,
        isCorrect,
        timeSpentMs < 30000, // Simplified basic check for mock questions
      ).newStatus,
      nextReviewSession: null, // Mock questions don't enter SRS
      isTopicRefreshed: false,
      newSuccessCount: currentStatus?.consecutive_success || 0,
      newFailsCount: currentStatus?.consecutive_fails || 0,
    };
  }

  const isRepeated = (currentStatus?.consecutive_fails || 0) > 0 ||
    (currentStatus?.consecutive_success || 0) > 0;

  let isFast = timeSpentMs < 30000;
  if (questionData && chunkMetadata) {
    const contentLength = chunkMetadata.content?.length || 0;
    const metadata = chunkMetadata.metadata || {};
    const conceptCount = metadata.concept_map?.length || 5;

    const bloomLevel = (questionData.bloom_level as BloomLevel) || "knowledge";
    const tMaxMs = calculateTMax(contentLength, conceptCount, bloomLevel);

    isFast = timeSpentMs <= tMaxMs;
  }

  const srsResult = calculateShelfStatus(
    currentStatus?.consecutive_success || 0,
    isCorrect,
    isFast,
  );

  const nextReviewSession = srsResult.newStatus === "pending_followup" ||
      srsResult.newStatus === "archived"
    ? calculateNextReviewSession(sessionNumber, srsResult.newSuccessCount)
    : null;

  const previousMastery = masteryData?.mastery_score || 0;
  const scoreChange = calculateScoreChange(
    responseType,
    previousMastery,
    isRepeated,
  );

  const newMastery = scoreChange.newScore;
  const scoreDelta = newMastery - previousMastery;

  const isTopicRefreshed = totalChunkQuestions > 0 &&
    uniqueSolvedCount / totalChunkQuestions >= 0.8;

  const newFailsCount = isCorrect
    ? 0
    : (currentStatus?.consecutive_fails || 0) + 1;

  return {
    isCorrect,
    scoreDelta,
    newMastery,
    newStatus: srsResult.newStatus,
    nextReviewSession,
    isTopicRefreshed,
    newSuccessCount: srsResult.newSuccessCount,
    newFailsCount,
  };
}
