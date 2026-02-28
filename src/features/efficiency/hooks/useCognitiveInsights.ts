import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCognitiveStore } from '@/features/efficiency/store/useCognitiveStore';
import { BloomStats, CognitiveInsight } from '@/features/quiz/types';

export function useCognitiveInsights() {
  const { user } = useAuth();

  const {
    bloomStats,
    recentSessions,
    recentQuizzes,
    cognitiveInsights,
    error,
    isFetchingBloom,
    isFetchingSessions,
    isFetchingQuizzes,
    isFetchingCognitive,
    fetchData,
  } = useCognitiveStore();

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user?.id, fetchData]);

  // Specific loading states for different cards
  const loadingBloom = isFetchingBloom && bloomStats === null;
  const loadingSessions = isFetchingSessions && recentSessions === null;
  const loadingQuizzes = isFetchingQuizzes && recentQuizzes === null;
  const loadingCognitive = isFetchingCognitive && cognitiveInsights === null;

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
