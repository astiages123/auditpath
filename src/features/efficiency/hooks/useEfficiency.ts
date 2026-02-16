import { useMemo } from "react";
import { DAILY_GOAL_MINUTES } from "@/utils/constants";
import { Session } from "../types/efficiencyTypes";
import {
  calculateGoalProgress,
  calculateLearningFlow,
  formatEfficiencyTime,
} from "../utils/efficiencyUtils";

// Composable Hooks
import { useDailyMetrics } from "./useDailyMetrics";
import { useEfficiencyTrends } from "./useEfficiencyTrends";
import { useCognitiveInsights } from "./useCognitiveInsights";
import { useMasteryChains } from "./useMasteryChains";

export interface EfficiencyMetrics {
  totalVideoTime: number; // minutes
  totalPomodoroTime: number; // minutes
}

export function useEfficiencyLogic(todayMetrics: EfficiencyMetrics) {
  const learningFlowMetrics = useMemo(() => {
    return calculateLearningFlow({
      totalVideoTime: todayMetrics.totalVideoTime,
      totalPomodoroTime: todayMetrics.totalPomodoroTime,
    });
  }, [todayMetrics.totalVideoTime, todayMetrics.totalPomodoroTime]);

  const learningFlow = learningFlowMetrics.score;
  const flowState = learningFlowMetrics.state;

  // Warning is now handled by flowState colors in UI, but we keep a boolean for backward compat if needed
  const isWarning = flowState !== "optimal";

  const goalProgress = useMemo(() => {
    return calculateGoalProgress(
      todayMetrics.totalPomodoroTime,
      DAILY_GOAL_MINUTES,
    );
  }, [todayMetrics.totalPomodoroTime]);

  return {
    learningFlow,
    flowState,
    isWarning,
    goalProgress,
    goalMinutes: DAILY_GOAL_MINUTES,
    currentMinutes: todayMetrics.totalPomodoroTime,
    formattedCurrentTime: formatEfficiencyTime(todayMetrics.totalPomodoroTime),
  };
}

export function useEfficiency() {
  // 1. Daily Metrics
  const {
    efficiencySummary,
    dailyGoalMinutes,
    todayVideoMinutes,
    todayVideoCount,
    videoTrendPercentage,
    trendPercentage,
    loading: loadingDaily,
  } = useDailyMetrics();

  // 2. Trends & Consistency
  const {
    efficiencyTrend,
    loadWeek,
    loadDay,
    loadMonth,
    loadAll,
    focusPowerWeek,
    focusPowerMonth,
    focusPowerAll,
    consistencyData,
    loading: loadingTrends,
  } = useEfficiencyTrends();

  // 3. Cognitive Insights & Bloom
  const {
    bloomStats,
    recentSessions,
    recentQuizzes,
    cognitiveAnalysis,
    loading: loadingInsights,
  } = useCognitiveInsights();

  // 4. Mastery Chains
  const {
    lessonMastery,
    masteryChainStats,
  } = useMasteryChains();

  // Global Loading State
  const loading = loadingDaily || loadingTrends || loadingInsights;

  // Transform Sessions for View
  const formattedSessions: Session[] = useMemo(() => {
    if (!efficiencySummary?.sessions) return [];

    return efficiencySummary.sessions.map((s) => {
      const startDate = new Date(s.startedAt);
      const totalDurationSec = s.workTimeSeconds + s.breakTimeSeconds +
        s.pauseTimeSeconds;
      const endDate = new Date(startDate.getTime() + totalDurationSec * 1000);

      // Access timeline safely
      const rawTimeline = (Array.isArray(s.timeline) ? s.timeline : []) as {
        type?: string;
        start: string | number;
        end: string | number;
      }[];
      const timeline = rawTimeline.map((item) => ({
        type: item.type?.toLowerCase() || "work",
        start: Number(item.start),
        end: Number(item.end),
        duration: Math.round(
          (Number(item.end) - Number(item.start)) / 1000 / 60,
        ),
      }));

      // Extract pause intervals for backward compatibility if needed
      const pauseIntervals = timeline
        .filter((t) => t.type === "pause")
        .map((t) => ({
          start: new Date(t.start).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          end: new Date(t.end).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

      return {
        id: s.id,
        lessonName: s.courseName || "Genel Çalışma",
        date: startDate.toISOString().split("T")[0],
        startTime: startDate.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        endTime: endDate.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        duration: Math.round(s.workTimeSeconds / 60),
        timeline,
        pauseIntervals,
      };
    });
  }, [efficiencySummary]);

  const currentWorkMinutes = Math.round(
    (efficiencySummary?.netWorkTimeSeconds || 0) / 60,
  );

  const logic = useEfficiencyLogic({
    totalVideoTime: todayVideoMinutes,
    totalPomodoroTime: currentWorkMinutes,
  });

  return {
    loading,
    sessions: formattedSessions,
    bloomStats, // Already formatted in sub-hook
    learningLoad: loadWeek, // Default for backward compatibility
    loadDay,
    loadWeek,
    loadMonth,
    loadAll,
    lessonMastery,
    consistencyData,
    dailyGoalMinutes,
    currentWorkMinutes,
    todayVideoMinutes,
    todayVideoCount,
    todayVideoCountRaw: todayVideoCount,
    videoTrendPercentage,
    efficiencyScore: efficiencySummary?.efficiencyScore || 0,
    efficiencyTrend,
    recentSessions,
    recentQuizzes,
    trendPercentage,
    cognitiveAnalysis,
    masteryChainStats,
    // Focus Power Data
    focusPowerWeek,
    focusPowerMonth,
    focusPowerAll,
    // Learning Flow Logic
    ...logic,
  };
}
