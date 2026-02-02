import { useMemo, useState } from "react";

// Using a 3:1 ratio: 3 mins of learning for 1 min of Pomodoro is the ideal baseline?
// Wait, the formula in the prompt is: (Completed Video Time * 3 / Spent Pomodoro Time) * 100
// If Video = 50min, Pomodoro = 50min -> (50*3/50)*100 = 300%?
// Logic check: "Efficiency = (Tamamlanan Video Süresi * 3 / Harcanan Pomodoro Süresi) * 100"
// Example: If I watched 20 mins of video in a 60 min session. (20 * 3 / 60) * 100 = 60/60 * 100 = 100%
// If I watched only 10 mins of video in 60 mins: (10 * 3 / 60) * 100 = 50% (Inefficient)
// If I watched 30 mins: (30 * 3 / 60) * 100 = 150% (Super efficient?)

interface EfficiencyMetrics {
    totalVideoTime: number; // minutes
    totalPomodoroTime: number; // minutes
}

export function useEfficiencyLogic(todayMetrics: EfficiencyMetrics) {
    const DAILY_GOAL_MINUTES = 200;

    const effectivenessScore = useMemo(() => {
        if (todayMetrics.totalPomodoroTime === 0) return 0;
        return Math.round(
            (todayMetrics.totalVideoTime * 3 / todayMetrics.totalPomodoroTime) *
                100,
        );
    }, [todayMetrics.totalVideoTime, todayMetrics.totalPomodoroTime]);

    // If score < 100%, it might be a warning zone
    const isWarning = effectivenessScore < 100;

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
        effectivenessScore,
        isWarning,
        goalProgress,
        goalMinutes: DAILY_GOAL_MINUTES,
        currentMinutes: todayMetrics.totalPomodoroTime,
        formattedCurrentTime: formattedTime(todayMetrics.totalPomodoroTime),
    };
}
