import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getBloomStats } from '@/features/quiz/services/quizAnalyticsService';
import {
  getRecentCognitiveInsights,
  getRecentQuizSessions,
} from '@/features/quiz/services/quizHistoryService';
import { getRecentActivitySessions } from '@/features/pomodoro/services/pomodoroService';
import { BloomStats, CognitiveInsight } from '@/features/quiz/types';

export function useCognitiveInsights() {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data: bloomStats,
    isLoading: loadingBloom,
    error: bloomError,
  } = useQuery({
    queryKey: ['bloomStats', userId],
    queryFn: () => getBloomStats(userId!),
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

  const error = bloomError || sessionsError || quizzesError || cognitiveError;

  // Derived State: Bloom Radar Data
  const order = ['Bilgi', 'Analiz', 'Uygula'];
  const mapLevel: Record<string, string> = {
    knowledge: 'Bilgi',
    application: 'Uygula',
    analysis: 'Analiz',
  };

  const bloomRadarData =
    !bloomStats || bloomStats.length === 0
      ? order.map((l) => ({
          level: l,
          score: 0,
          questionsSolved: 0,
          correct: 0,
        }))
      : bloomStats
          .map((b: BloomStats) => ({
            level: mapLevel[b.level] || b.level,
            score: b.score,
            questionsSolved: b.questionsSolved,
            correct: b.correct || 0,
          }))
          // Sort by defined order
          .sort((a: { level: string }, b: { level: string }) => {
            const idxA = order.indexOf(a.level);
            const idxB = order.indexOf(b.level);
            // If not in order list, put at end
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
          });

  // Derived State: Cognitive Analysis
  const cognitiveAnalysis = (() => {
    if (!cognitiveInsights || !cognitiveInsights.length) return null;

    let totalCorrect = 0;
    let totalAttempts = 0;
    let totalConsecutiveFails = 0;
    const confusedConceptsMap = new Map<string, number>();

    cognitiveInsights.forEach((c: CognitiveInsight) => {
      totalAttempts++;
      if (c.responseType === 'correct') totalCorrect++;
      totalConsecutiveFails += c.consecutiveFails;

      if (c.diagnosis) {
        const diag = c.diagnosis;
        confusedConceptsMap.set(diag, (confusedConceptsMap.get(diag) || 0) + 1);
      }
    });

    const rawScore =
      totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
    const penalty = totalConsecutiveFails * 5;
    const focusScore = Math.max(0, Math.round(rawScore - penalty));

    const topConfused = Array.from(confusedConceptsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({ text, count }));

    const recentInsights = Array.from(
      new Set(
        cognitiveInsights
          .map((c: CognitiveInsight) => c.insight)
          .filter(Boolean)
      )
    ).slice(0, 5);

    const criticalTopics = cognitiveInsights
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
