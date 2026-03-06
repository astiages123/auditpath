import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getRecentCognitiveInsights,
  getRecentQuizSessions,
} from '@/features/quiz/services/quizHistoryService';
import { getBloomStats } from '@/features/quiz/services/quizAnalyticsService';
import { getRecentActivitySessions } from '@/features/pomodoro/services/pomodoroService';

import type { CognitiveInsight } from '@/features/quiz/types';
import type { BloomStats, RecentQuizSession } from '@/features/quiz/types';
import type { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';

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

  const {
    data: bloomData,
    isLoading: isLoadingBloom,
    error: bloomError,
  } = useQuery({
    queryKey: ['bloomStats', userId],
    queryFn: () => getBloomStats(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: recentSessions,
    isLoading: isLoadingSessions,
    error: sessionsError,
  } = useQuery({
    queryKey: ['recentSessions', userId],
    queryFn: () => getRecentActivitySessions(userId!, 20),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: recentQuizzes,
    isLoading: isLoadingQuizzes,
    error: quizzesError,
  } = useQuery({
    queryKey: ['recentQuizzes', userId],
    queryFn: () => getRecentQuizSessions(userId!, 50),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: cognitiveInsights,
    isLoading: isLoadingCognitive,
    error: cognitiveError,
  } = useQuery({
    queryKey: ['cognitiveInsights', userId],
    queryFn: () => getRecentCognitiveInsights(userId!, 30),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const hasError =
    bloomError || sessionsError || quizzesError || cognitiveError;

  const order = ['Bilgi', 'Analiz', 'Uygula'];
  const bloomRadarData = order.map((levelText: string) => {
    const levelStats = bloomData?.find(
      (bloomStat: BloomStats) => bloomStat.level === levelText
    );
    return {
      level: levelText,
      score: levelStats?.score || 0,
      questionsSolved: levelStats?.questionsSolved || 0,
      correct: levelStats?.correct || 0,
    };
  });

  const cognitiveAnalysis = (() => {
    if (!cognitiveInsights || !cognitiveInsights.length) return null;

    let totalCorrect = 0;
    let totalAttempts = 0;
    let totalConsecutiveFails = 0;
    const confusedConceptsMap = new Map<string, number>();

    cognitiveInsights.forEach((insight: CognitiveInsight) => {
      totalAttempts++;
      if (insight.responseType === 'correct') {
        totalCorrect++;
      }
      totalConsecutiveFails += insight.consecutiveFails;

      if (insight.diagnosis) {
        confusedConceptsMap.set(
          insight.diagnosis,
          (confusedConceptsMap.get(insight.diagnosis) || 0) + 1
        );
      }
    });

    const rawScore =
      totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
    const penalty = totalConsecutiveFails * 5;
    const focusScore = Math.max(0, Math.round(rawScore - penalty));

    const topConfused: ConfusedConcept[] = Array.from(
      confusedConceptsMap.entries()
    )
      .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])
      .slice(0, 5)
      .map(([text, count]) => ({ text, count }));

    const recentInsights: string[] = Array.from(
      new Set(
        cognitiveInsights
          .map((insight: CognitiveInsight) => insight.insight)
          .filter((insightText): insightText is string => Boolean(insightText))
      )
    ).slice(0, 5);

    const criticalTopics: CriticalTopic[] = cognitiveInsights
      .filter((insight: CognitiveInsight) => insight.consecutiveFails >= 2)
      .map((insight: CognitiveInsight) => ({
        id: insight.questionId,
        fails: insight.consecutiveFails,
        diagnosis: insight.diagnosis,
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

  return {
    loadingBloom: isLoadingBloom,
    loadingSessions: isLoadingSessions,
    loadingQuizzes: isLoadingQuizzes,
    loadingCognitive: isLoadingCognitive,
    error: hasError,
    bloomStats: bloomRadarData,
    recentSessions: recentSessions || [],
    recentQuizzes: recentQuizzes || [],
    cognitiveAnalysis,
  };
}
