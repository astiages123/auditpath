import {
  type ConceptMapItem,
  type ExamDistributionInput,
  type ExamSubjectWeight,
  type QuizResponseType,
  type SubmissionResult,
} from '@/features/quiz/types';
import {
  CATEGORY_DISTRIBUTIONS,
  CATEGORY_MAPPINGS,
  type CourseCategory,
  DEFAULT_CATEGORY,
  EXAM_STRATEGY,
} from '@/features/courses/utils/constants';
import {
  type BloomLevel,
  calculateScoreChange,
  calculateTMax,
} from './quizCoreLogic';
import { BLOOM_INSTRUCTIONS } from './prompts';

// --- Constants ---
const SESSION_GAPS = [1, 3, 7, 14, 30];
const SLOW_SUCCESS_INCREMENT = 0.5;

export function getSubjectStrategy(
  courseName: string
): ExamSubjectWeight | undefined {
  const normalizedName = courseName
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/ /g, '-')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

  return (
    EXAM_STRATEGY[normalizedName] || EXAM_STRATEGY[courseName] || undefined
  );
}

export function getCourseCategory(courseName: string): CourseCategory {
  return CATEGORY_MAPPINGS[courseName] || DEFAULT_CATEGORY;
}

export function determineNodeStrategy(
  index: number,
  concept?: ConceptMapItem,
  courseName: string = ''
): {
  bloomLevel: BloomLevel;
  instruction: string;
} {
  if (concept?.seviye) {
    if (concept.seviye === 'Analiz') {
      return {
        bloomLevel: 'analysis',
        instruction: BLOOM_INSTRUCTIONS.analysis,
      };
    }
    if (concept.seviye === 'Uygulama') {
      return {
        bloomLevel: 'application',
        instruction: BLOOM_INSTRUCTIONS.application,
      };
    }
    if (concept.seviye === 'Bilgi') {
      return {
        bloomLevel: 'knowledge',
        instruction: BLOOM_INSTRUCTIONS.knowledge,
      };
    }
  }

  const category = getCourseCategory(courseName);
  const distribution = CATEGORY_DISTRIBUTIONS[category];
  const cycleIndex = index % 10;
  const targetBloomLevel = (distribution[cycleIndex] ||
    'knowledge') as BloomLevel;

  return {
    bloomLevel: targetBloomLevel,
    instruction: BLOOM_INSTRUCTIONS[targetBloomLevel],
  };
}

export function calculateQuestionWeights(
  input: ExamDistributionInput
): Map<string, number> {
  const { examTotal, importance, chunks } = input;

  if (chunks.length === 0) {
    return new Map();
  }

  const importanceScore =
    importance === 'high' ? 1.0 : importance === 'medium' ? 0.7 : 0.4;

  const maxConceptCount = Math.max(...chunks.map((c) => c.concept_count), 1);

  const chunkWeights = chunks.map((chunk) => {
    const normalizedMastery = Math.min(
      Math.max(chunk.mastery_score / 100, 0),
      1
    );
    const masteryFactor = 1.0 - normalizedMastery;
    const lengthFactor = chunk.concept_count / maxConceptCount;
    const difficulty = chunk.difficulty_index || 3;
    const densityFactor = (difficulty - 1) / 4;

    const weight =
      importanceScore * 0.4 +
      masteryFactor * 0.3 +
      densityFactor * 0.2 +
      lengthFactor * 0.1;

    return {
      id: chunk.id,
      weight,
      original: chunk,
    };
  });

  const totalWeight = chunkWeights.reduce((sum, c) => sum + c.weight, 0);
  const result = new Map<string, number>();

  if (totalWeight === 0) {
    const baseCount = Math.floor(examTotal / chunks.length);
    let remainder = examTotal % chunks.length;
    chunks.forEach((c) => {
      result.set(c.id, baseCount + (remainder > 0 ? 1 : 0));
      remainder--;
    });
    return result;
  }

  let currentTotal = 0;
  const allocations = chunkWeights.map((c) => {
    const exactShare = (c.weight / totalWeight) * examTotal;
    const floorShare = Math.floor(exactShare);
    const remainder = exactShare - floorShare;
    return {
      id: c.id,
      count: floorShare,
      remainder,
    };
  });

  allocations.forEach((a) => (currentTotal += a.count));

  const remainingQuestions = examTotal - currentTotal;
  allocations.sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < remainingQuestions; i++) {
    if (allocations[i]) allocations[i].count += 1;
  }

  allocations.forEach((a) => {
    result.set(a.id, a.count);
  });

  return result;
}

export function calculateShelfStatus(
  consecutiveSuccess: number,
  isCorrect: boolean,
  isFast: boolean
): {
  newStatus: 'archived' | 'pending_followup' | 'active';
  newSuccessCount: number;
} {
  if (!isCorrect) {
    return { newStatus: 'pending_followup', newSuccessCount: 0 };
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
    metadata: Record<string, unknown> | null;
  } | null,
  masteryData: {
    mastery_score: number;
  } | null,
  uniqueSolvedCount: number,
  totalChunkQuestions: number,
  sessionNumber: number
): SubmissionResult {
  const isCorrect = responseType === 'correct';

  if (questionData?.usage_type === 'deneme') {
    // Deneme soruları SRS ve puanlama sisteminden bağımsızdır, hiçbir veriyi etkilemez.
    return {
      isCorrect,
      scoreDelta: 0,
      newMastery: masteryData?.mastery_score || 0,
      newStatus: 'active', // Deneme soruları durumu değiştirmez, varsayılan 'active' döner
      nextReviewSession: null,
      isTopicRefreshed: false,
      newSuccessCount: currentStatus?.consecutive_success || 0,
      newFailsCount: currentStatus?.consecutive_fails || 0,
    };
  }

  const isRepeated =
    (currentStatus?.consecutive_fails || 0) > 0 ||
    (currentStatus?.consecutive_success || 0) > 0;

  let isFast = timeSpentMs < 30000;
  if (questionData && chunkMetadata) {
    const contentLength = chunkMetadata.content?.length || 0;
    const metadata =
      (chunkMetadata.metadata as { concept_map?: unknown[] } | null) || {};
    const conceptCount = metadata.concept_map?.length || 5;

    const bloomLevel = (questionData.bloom_level as BloomLevel) || 'knowledge';
    const tMaxMs = calculateTMax(contentLength, conceptCount, bloomLevel);

    isFast = timeSpentMs <= tMaxMs;
  }

  const srsResult = calculateShelfStatus(
    currentStatus?.consecutive_success || 0,
    isCorrect,
    isFast
  );

  const nextReviewSession =
    srsResult.newStatus === 'pending_followup' ||
    srsResult.newStatus === 'archived'
      ? calculateNextReviewSession(sessionNumber, srsResult.newSuccessCount)
      : null;

  const previousMastery = masteryData?.mastery_score || 0;
  const scoreChange = calculateScoreChange(
    responseType,
    previousMastery,
    isRepeated
  );

  const newMastery = scoreChange.newScore;
  const scoreDelta = newMastery - previousMastery;

  const isTopicRefreshed =
    totalChunkQuestions > 0 && uniqueSolvedCount / totalChunkQuestions >= 0.8;

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
