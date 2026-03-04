import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getRecentCognitiveInsights,
  getRecentQuizSessions,
} from '@/features/quiz/services/quizHistoryService';
import { getRecentActivitySessions } from '@/features/pomodoro/services/pomodoroService';

import type { CognitiveInsight } from '@/features/quiz/types';
import type { BloomStats, RecentQuizSession } from '@/features/quiz/types';
import type { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';

// ==========================================
// === TYPES ===
// ==========================================

export interface ConfusedConcept {
  text: string;
  count: number;
}

export interface CriticalTopic {
  id: string;
  fails: number;
  diagnosis?: string | null;
}

export interface CognitiveAnalysis {
  focusScore: number;
  topConfused: ConfusedConcept[];
  recentInsights: string[];
  criticalTopics: CriticalTopic[];
  hasData: boolean;
}

export interface CognitiveInsightsHook {
  loadingBloom: boolean;
  loadingSessions: boolean;
  loadingQuizzes: boolean;
  loadingCognitive: boolean;
  error: unknown;
  bloomStats: {
    level: string;
    score: number;
    questionsSolved: number;
    correct: number;
  }[];
  recentSessions: RecentSession[];
  recentQuizzes: RecentQuizSession[];
  cognitiveAnalysis: CognitiveAnalysis | null;
}

// ==========================================
// === HOOK ===
// ==========================================

/**
 * Fetches and processes the user's cognitive insights, including
 * bloom statistics, recent session activity, quiz sessions, and creates
 * a dynamic cognitive analysis score.
 *
 * @returns {CognitiveInsightsHook} Hook data containing loading states, errors, and processed cognitive metrics
 */
export function useCognitiveInsights(): CognitiveInsightsHook {
  const { user } = useAuth();
  const userId = user?.id;

  // --- QUERIES ---

  const { isLoading: loadingBloom, error: bloomError } = useQuery({
    queryKey: ['bloomStats', userId],
    queryFn: () => Promise.resolve([] as BloomStats[]),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: recentSessions,
    isLoading: loadingSessions,
    error: sessionsError,
  } = useQuery({
    queryKey: ['recentSessions', userId],
    queryFn: () => getRecentActivitySessions(userId!, 20),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: recentQuizzes,
    isLoading: loadingQuizzes,
    error: quizzesError,
  } = useQuery({
    queryKey: ['recentQuizzes', userId],
    queryFn: () => getRecentQuizSessions(userId!, 50),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: cognitiveInsights,
    isLoading: loadingCognitive,
    error: cognitiveError,
  } = useQuery({
    queryKey: ['cognitiveInsights', userId],
    queryFn: () => getRecentCognitiveInsights(userId!, 30),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // --- DERIVED STATE ---

  const error = bloomError || sessionsError || quizzesError || cognitiveError;

  const order = ['Bilgi', 'Analiz', 'Uygula'];
  const bloomRadarData = order.map((levelText: string) => ({
    level: levelText,
    score: 0,
    questionsSolved: 0,
    correct: 0,
  }));

  const cognitiveAnalysis = (() => {
    if (!cognitiveInsights || !cognitiveInsights.length) return null;

    let totalCorrect = 0;
    let totalAttempts = 0;
    let totalConsecutiveFails = 0;
    const confusedConceptsMap = new Map<string, number>();

    cognitiveInsights.forEach((c: CognitiveInsight) => {
      totalAttempts++;
      if (c.responseType === 'correct') {
        totalCorrect++;
      }
      totalConsecutiveFails += c.consecutiveFails;

      if (c.diagnosis) {
        const diag: string = c.diagnosis;
        confusedConceptsMap.set(diag, (confusedConceptsMap.get(diag) || 0) + 1);
      }
    });

    const rawScore =
      totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
    const penalty = totalConsecutiveFails * 5;
    const focusScore = Math.max(0, Math.round(rawScore - penalty));

    const topConfused: ConfusedConcept[] = Array.from(
      confusedConceptsMap.entries()
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({ text, count }));

    const recentInsights: string[] = Array.from(
      new Set(
        cognitiveInsights
          .map((c: CognitiveInsight) => c.insight)
          .filter((val): val is string => Boolean(val))
      )
    ).slice(0, 5);

    const criticalTopics: CriticalTopic[] = cognitiveInsights
      .filter((c: CognitiveInsight) => c.consecutiveFails >= 2)
      .map((c: CognitiveInsight) => ({
        id: c.questionId,
        fails: c.consecutiveFails,
        diagnosis: c.diagnosis,
      }))
      .slice(0, 3);

    return {
      focusScore,
      topConfused,
      recentInsights,
      criticalTopics,
      hasData: true,
    };
  })();

  // --- RETURN ---

  return {
    loadingBloom,
    loadingSessions,
    loadingQuizzes,
    loadingCognitive,
    error,
    bloomStats: bloomRadarData,
    recentSessions: recentSessions || [],
    recentQuizzes: recentQuizzes || [],
    cognitiveAnalysis,
  };
}
