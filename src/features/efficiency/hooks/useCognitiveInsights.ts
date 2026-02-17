import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getBloomStats } from "@/features/quiz/services/core/quizAnalyticsService";
import {
  getRecentCognitiveInsights,
  getRecentQuizSessions,
} from "@/features/quiz/services/core/quizHistoryService";
import { getRecentActivitySessions } from "@/features/pomodoro/services/pomodoroService";
import {
  CognitiveInsight,
  RecentQuizSession,
} from "@/features/quiz/types/quizTypes";
import { RecentSession } from "@/features/pomodoro/types/pomodoroTypes";
import { BloomStats } from "@/features/quiz/types/quizTypes";
import { logger } from "@/utils/logger";

export function useCognitiveInsights() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [bloomStats, setBloomStats] = useState<BloomStats[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuizSession[]>([]);
  const [cognitiveInsights, setCognitiveInsights] = useState<
    CognitiveInsight[]
  >([]);

  useEffect(() => {
    async function fetchInsights() {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      try {
        const [bloom, recent, quizzes, cognitive] = await Promise.all([
          getBloomStats(user.id),
          getRecentActivitySessions(user.id, 100),
          getRecentQuizSessions(user.id, 50),
          getRecentCognitiveInsights(user.id, 30),
        ]);

        setBloomStats(bloom || []);
        setRecentSessions(recent || []);
        setRecentQuizzes(quizzes || []);
        setCognitiveInsights(cognitive || []);
      } catch (err) {
        logger.error("Failed to fetch cognitive insights", err as Error);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [user?.id]);

  // Derived State: Bloom Radar Data
  const bloomRadarData = useMemo(() => {
    const order = ["Bilgi", "Analiz", "Uygula"];
    const mapLevel: Record<string, string> = {
      knowledge: "Bilgi",
      application: "Uygula",
      analysis: "Analiz",
    };

    if (!bloomStats || bloomStats.length === 0) {
      return order.map((l) => ({
        level: l,
        score: 0,
        questionsSolved: 0,
        correct: 0,
      }));
    }

    return (
      bloomStats
        .map((b) => ({
          level: mapLevel[b.level] || b.level,
          score: b.score,
          questionsSolved: b.questionsSolved,
          correct: b.correct || 0,
        }))
        // Sort by defined order
        .sort((a, b) => {
          const idxA = order.indexOf(a.level);
          const idxB = order.indexOf(b.level);
          // If not in order list, put at end
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        })
    );
  }, [bloomStats]);

  // Derived State: Cognitive Analysis
  const cognitiveAnalysis = useMemo(() => {
    if (!cognitiveInsights.length) return null;

    let totalCorrect = 0;
    let totalAttempts = 0;
    let totalConsecutiveFails = 0;
    const confusedConceptsMap = new Map<string, number>();

    cognitiveInsights.forEach((c) => {
      totalAttempts++;
      if (c.responseType === "correct") totalCorrect++;
      totalConsecutiveFails += c.consecutiveFails;

      if (c.diagnosis) {
        const diag = c.diagnosis;
        confusedConceptsMap.set(diag, (confusedConceptsMap.get(diag) || 0) + 1);
      }
    });

    const rawScore = totalAttempts > 0
      ? (totalCorrect / totalAttempts) * 100
      : 0;
    const penalty = totalConsecutiveFails * 5;
    const focusScore = Math.max(0, Math.round(rawScore - penalty));

    const topConfused = Array.from(confusedConceptsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({ text, count }));

    const recentInsights = Array.from(
      new Set(cognitiveInsights.map((c) => c.insight).filter(Boolean)),
    ).slice(0, 5);

    const criticalTopics = cognitiveInsights
      .filter((c) => c.consecutiveFails >= 2)
      .map((c) => ({
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
  }, [cognitiveInsights]);

  return {
    loading,
    error,
    bloomStats: bloomRadarData,
    recentSessions,
    recentQuizzes,
    cognitiveAnalysis,
  };
}
