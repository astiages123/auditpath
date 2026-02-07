import { useMemo } from "react";
import { EFFICIENCY_THRESHOLDS } from "@/features/pomodoro/lib/pomodoro-utils";

// Using a 1.0x centered symmetric spectrum for flow states
// New thresholds: 0.25, 0.75, 1.25, 1.75

interface EfficiencyMetrics {
    totalVideoTime: number; // minutes
    totalPomodoroTime: number; // minutes
}

export type flowState = "stuck" | "deep" | "optimal" | "speed" | "shallow";

export function useEfficiencyLogic(todayMetrics: EfficiencyMetrics) {
    const DAILY_GOAL_MINUTES = 200;

    const learningFlowMetrics = useMemo(() => {
        // Safety Guard: if no work done, flow is 0
        if (todayMetrics.totalPomodoroTime === 0) {
            return { score: 0, state: "stuck" as const };
        }

        // 1. Calculate Ratio (Video / Pomodoro)
        const ratio = todayMetrics.totalVideoTime /
            todayMetrics.totalPomodoroTime;
        const score = Number(ratio.toFixed(2));

        // 2. Determine State based on 1.0x centered symmetric spectrum
        let state: flowState;

        if (score < EFFICIENCY_THRESHOLDS.STUCK) {
            state = "stuck";
        } else if (score < EFFICIENCY_THRESHOLDS.DEEP) {
            state = "deep";
        } else if (score <= EFFICIENCY_THRESHOLDS.OPTIMAL_MAX) {
            state = "optimal";
        } else if (score <= EFFICIENCY_THRESHOLDS.SPEED) {
            state = "speed";
        } else {
            state = "shallow";
        }

        return { score, state };
    }, [todayMetrics.totalVideoTime, todayMetrics.totalPomodoroTime]);

    const learningFlow = learningFlowMetrics.score;
    const flowState = learningFlowMetrics.state;

    // Warning is now handled by flowState colors in UI, but we keep a boolean for backward compat if needed
    const isWarning = flowState !== "optimal";

    const goalProgress = useMemo(() => {
        return Math.min(
            Math.round(
                (todayMetrics.totalPomodoroTime / DAILY_GOAL_MINUTES) * 100,
            ),
            100,
        );
    }, [todayMetrics.totalPomodoroTime]);

    const formattedTime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}sa ${m}dk`;
    };

    return {
        learningFlow,
        flowState,
        isWarning,
        goalProgress,
        goalMinutes: DAILY_GOAL_MINUTES,
        currentMinutes: todayMetrics.totalPomodoroTime,
        formattedCurrentTime: formattedTime(todayMetrics.totalPomodoroTime),
    };
}
