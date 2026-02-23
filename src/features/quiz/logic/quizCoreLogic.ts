import type { Database } from '@/types/database.types';
import {
  type AdvancedScoreResult,
  type ConceptMapItem,
  type MasteryNode,
  type QuizResponseType,
  type QuizResults,
  type TestResultSummary,
} from '../types';
import { QUIZ_CONFIG } from '../utils/constants';

// ============================================================================
// Quiz Timer (formerly quizTimer.ts)
// ============================================================================

export function createTimer() {
  let startTime: number | null = null;
  let accumulatedTime = 0;
  let isRunning = false;
  let isListenerAttached = false;

  const handleVisibilityChange = () => {
    if (
      document.visibilityState === 'hidden' &&
      isRunning &&
      startTime !== null
    ) {
      accumulatedTime += Date.now() - startTime;
      startTime = null;
      isRunning = false;
    } else if (
      document.visibilityState === 'visible' &&
      !isRunning &&
      startTime === null
    ) {
      startTime = Date.now();
      isRunning = true;
    }
  };

  const attachListener = () => {
    if (typeof document !== 'undefined' && !isListenerAttached) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      isListenerAttached = true;
    }
  };

  const detachListener = () => {
    if (typeof document !== 'undefined' && isListenerAttached) {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      isListenerAttached = false;
    }
  };

  return {
    start: () => {
      attachListener();
      if (startTime === null) {
        startTime = Date.now();
        isRunning = true;
      }
    },
    stop: () => {
      if (startTime !== null) {
        accumulatedTime += Date.now() - startTime;
        startTime = null;
        isRunning = false;
      }
      return accumulatedTime;
    },
    reset: () => {
      attachListener();
      startTime = Date.now();
      accumulatedTime = 0;
      isRunning = true;
    },
    clear: () => {
      detachListener();
      startTime = null;
      accumulatedTime = 0;
      isRunning = false;
    },
    getTime: () => {
      if (startTime !== null) {
        return accumulatedTime + (Date.now() - startTime);
      }
      return accumulatedTime;
    },
  };
}

// ============================================================================
// Scoring & Results Logic (formerly scoring.ts)
// ============================================================================

export type BloomLevel = Database['public']['Enums']['bloom_level'];

export const POINTS_CORRECT = 10;
export const PENALTY_INCORRECT_FIRST = 5;
export const PENALTY_BLANK_FIRST = 2;
export const PENALTY_REPEATED = 10;

export const MASTERY_WEIGHTS = { coverage: 0.4, score: 0.6 } as const;

export const BLOOM_COEFFICIENTS: Record<BloomLevel, number> = {
  knowledge: 1.0,
  application: 1.3,
  analysis: 1.6,
};

export const TARGET_TIMES_MS: Record<BloomLevel, number> = {
  knowledge: 20_000,
  application: 35_000,
  analysis: 50_000,
};

export const DIFFICULTY_MULTIPLIERS: Record<BloomLevel, number> = {
  knowledge: 1.0,
  application: 1.2,
  analysis: 1.5,
};

export function calculateInitialResults(): QuizResults {
  return { correct: 0, incorrect: 0, blank: 0, totalTimeMs: 0 };
}

export function updateResults(
  currentResults: QuizResults,
  type: 'correct' | 'incorrect' | 'blank',
  timeMs: number
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

export function calculateTestResults(
  correct: number,
  incorrect: number,
  blank: number,
  timeSpentMs: number
): TestResultSummary {
  const total = correct + incorrect + blank;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const masteryScore =
    total > 0
      ? Math.round(
          ((correct * 1.0 + incorrect * 0.2 + blank * 0.0) / total) * 100
        )
      : 0;
  const pendingReview = incorrect + blank;
  const seconds = Math.floor(timeSpentMs / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  const mRemaining = m % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const totalTimeFormatted = `${pad(h)}:${pad(mRemaining)}:${pad(s)}`;

  return { percentage, masteryScore, pendingReview, totalTimeFormatted };
}

export function calculateChunkMastery(
  totalQuestions: number,
  uniqueSolved: number,
  averageScore: number
): number {
  if (totalQuestions === 0) return 0;
  const coverageRatio = Math.min(1, uniqueSolved / totalQuestions);
  const coverageScore = coverageRatio * (MASTERY_WEIGHTS.coverage * 100);
  const scoreComponent = averageScore * MASTERY_WEIGHTS.score;
  return Math.round(coverageScore + scoreComponent);
}

export function calculateScoreChange(
  responseType: QuizResponseType,
  currentScore: number,
  isRepeated: boolean = false
): { delta: number; newScore: number } {
  let delta = 0;
  if (responseType === 'correct') {
    delta = POINTS_CORRECT;
  } else {
    if (isRepeated) {
      delta = -PENALTY_REPEATED;
    } else {
      if (responseType === 'incorrect') delta = -PENALTY_INCORRECT_FIRST;
      else if (responseType === 'blank') delta = -PENALTY_BLANK_FIRST;
    }
  }
  const newScore = Math.max(0, Math.min(100, currentScore + delta));
  return { delta, newScore };
}

export function calculateAdvancedScore(
  deltaP: number,
  bloomLevel: BloomLevel,
  timeSpentMs: number
): AdvancedScoreResult {
  const bloomCoeff = BLOOM_COEFFICIENTS[bloomLevel || 'knowledge'] || 1.0;
  const tTarget = TARGET_TIMES_MS[bloomLevel || 'knowledge'] || 20000;
  const tActual = Math.max(timeSpentMs, 1000);
  const timeRatio = Math.min(2.0, Math.max(0.5, tTarget / tActual));
  const rawFinal = deltaP * bloomCoeff * timeRatio;
  const finalScore = Math.round(rawFinal * 100) / 100;
  return {
    baseDelta: deltaP,
    finalScore,
    bloomCoeff,
    timeRatio: Math.round(timeRatio * 100) / 100,
  };
}

export function calculateQuotas(concepts: { length: number }): {
  antrenman: number;
  deneme: number;
  arsiv: number;
} {
  const count = concepts.length;
  const antrenmanBase = Math.max(5, count);
  return {
    antrenman: antrenmanBase,
    arsiv: Math.ceil(antrenmanBase * 0.3),
    deneme: Math.ceil(antrenmanBase * 0.2),
  };
}

export interface TMaxParams {
  charCount: number;
  conceptCount: number;
  bloomLevel: BloomLevel;
  bufferSeconds?: number;
}

/**
 * Calculates the maximum allowed time for a question response.
 * Improved to use a parameter object for better readability.
 */
export function calculateTMax({
  charCount,
  conceptCount,
  bloomLevel,
  bufferSeconds = 10,
}: TMaxParams): number {
  const difficultyMultiplier =
    DIFFICULTY_MULTIPLIERS[bloomLevel || 'knowledge'] || 1.0;

  // Constants for readability
  const CHARS_PER_MINUTE = 780;
  const BASE_COMPLEXITY_SECONDS = 15;
  const SECONDS_PER_CONCEPT = 2;

  // Handle edge cases
  const safeCharCount = Math.max(0, charCount);
  const safeConceptCount = Math.max(0, conceptCount);

  const readingTimeSeconds = (safeCharCount / CHARS_PER_MINUTE) * 60;
  const complexitySeconds =
    (BASE_COMPLEXITY_SECONDS + safeConceptCount * SECONDS_PER_CONCEPT) *
    difficultyMultiplier;

  const tMaxSeconds = readingTimeSeconds + complexitySeconds + bufferSeconds;

  return Math.round(tMaxSeconds * 1000);
}

// ============================================================================
// Mastery Nodes & Atlas Processing (formerly scoring.ts/mastery.ts)
// ============================================================================

export function calculateMasteryChains(
  concepts: ConceptMapItem[],
  conceptScoreMap: Record<string, number>
): MasteryNode[] {
  const nodes: MasteryNode[] = concepts.map((concept, index) => {
    const score = conceptScoreMap[concept.baslik] || 0;
    let status: MasteryNode['status'] = 'weak';
    if (score >= QUIZ_CONFIG.MASTERY_THRESHOLDS.EXCELLENT) status = 'mastered';
    else if (score >= QUIZ_CONFIG.MASTERY_THRESHOLDS.GOOD) {
      status = 'in-progress';
    }

    return {
      id: `node-${index}`,
      label: concept.baslik,
      mastery: score,
      status,
      prerequisites: concept.prerequisites || [],
      isChainComplete: score >= QUIZ_CONFIG.MASTERY_THRESHOLDS.EXCELLENT,
      depth: 0,
      data: { focus: concept.odak, aiInsight: undefined },
    };
  });

  // Optimize lookup: Map label to MasteryNode
  const nodeMap = new Map<string, MasteryNode>();
  nodes.forEach((n) => nodeMap.set(n.label, n));

  const calculateDepth = (
    node: MasteryNode,
    visited: Set<string> = new Set()
  ): number => {
    if (visited.has(node.id)) return 0;
    visited.add(node.id);
    if (!node.prerequisites || node.prerequisites.length === 0) return 0;

    const prereqDepths = node.prerequisites.map((prereqLabel) => {
      const prereqNode = nodeMap.get(prereqLabel);
      return prereqNode ? calculateDepth(prereqNode, new Set(visited)) + 1 : 0;
    });
    return Math.max(...prereqDepths, 0);
  };

  nodes.forEach((node) => {
    node.depth = calculateDepth(node);
  });
  return nodes;
}

export function processGraphForAtlas(nodes: MasteryNode[]): {
  totalChains: number;
  resilienceBonusDays: number;
  nodes: MasteryNode[];
  edges: { source: string; target: string; isStrong: boolean }[];
} {
  const edges: { source: string; target: string; isStrong: boolean }[] = [];
  const nodeMap = new Map<string, MasteryNode>();
  nodes.forEach((n) => nodeMap.set(n.label, n));

  nodes.forEach((node) => {
    node.prerequisites.forEach((prereqLabel) => {
      const prereqNode = nodeMap.get(prereqLabel);
      if (prereqNode) {
        edges.push({
          source: prereqNode.id,
          target: node.id,
          isStrong:
            prereqNode.mastery >= QUIZ_CONFIG.MASTERY_THRESHOLDS.EXCELLENT &&
            node.mastery >= QUIZ_CONFIG.MASTERY_THRESHOLDS.EXCELLENT,
        });
      }
    });
  });

  const visited = new Set<string>();
  let totalChains = 0;
  const visitNode = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .forEach((e) => {
        visitNode(e.source === nodeId ? e.target : e.source);
      });
  };

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      totalChains++;
      visitNode(node.id);
    }
  });

  const masteredChains = edges.filter((e) => e.isStrong).length;
  const resilienceBonusDays = Math.floor(masteredChains * 0.5);

  return { totalChains, resilienceBonusDays, nodes, edges };
}
