import { supabase } from "@/lib/supabase";
import { calculateFocusPower } from "@/utils/math";
import { getVirtualDateKey } from "@/utils/helpers";
import type { DayActivity } from "@/features/efficiency/types/efficiencyTypes";
import type {
    FocusPowerPoint,
    LearningLoad,
} from "../../types/efficiencyTypes";

export interface LearningLoadParams {
    userId: string;
    days: number;
}

export async function getLearningLoadData({
    userId,
    days,
}: LearningLoadParams): Promise<LearningLoad[]> {
    const queryStartDate = new Date();
    queryStartDate.setMonth(queryStartDate.getMonth() - 6); // Fetch enough history
    const queryStartDateStr = queryStartDate.toISOString();

    const { data: sessionsData } = await supabase
        .from("pomodoro_sessions")
        .select("started_at, total_work_time")
        .eq("user_id", userId)
        .gte("started_at", queryStartDateStr);

    const dailyMap = new Map<string, number>();

    sessionsData?.forEach((s) => {
        const dateKey = getVirtualDateKey(new Date(s.started_at));
        const mins = Math.round((s.total_work_time || 0) / 60);
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + mins);
    });

    // Decide how many days to return.
    // If 'days' is small (like 7 or 30), we strictly conform to that range.
    // The 'days' param implies "Last N days".

    const rawData: (LearningLoad & { rawDate: Date })[] = [];

    // Create range for requested days
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(12, 0, 0, 0); // Noon to avoid timezone shifts
        d.setDate(d.getDate() - i);

        const dateKey = getVirtualDateKey(d);
        const dayName = i === 0 ? "Bugün" : d.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
        });

        rawData.push({
            day: dayName,
            videoMinutes: 0,
            extraStudyMinutes: Math.round(dailyMap.get(dateKey) || 0),
            rawDate: new Date(d),
        });
    }

    // If showing many days (like 180), we might filter empty weekends to reduce noise
    if (days > 30) {
        return rawData.filter((item) => {
            const d = item.rawDate;
            const dayOfWeek = d.getDay(); // 0 is Sunday
            const totalMins = item.extraStudyMinutes;
            // Skip empty weekends
            if (totalMins === 0 && (dayOfWeek === 0 || dayOfWeek === 6)) {
                return false;
            }
            return true;
        });
    }

    return rawData;
}

export async function getFocusPowerData({
    userId,
    range,
}: {
    userId: string;
    range: "week" | "month" | "all";
}): Promise<FocusPowerPoint[]> {
    const queryStartDate = new Date();
    queryStartDate.setMonth(queryStartDate.getMonth() - 6);
    const queryStartDateStr = queryStartDate.toISOString();

    const { data: sessionsData } = await supabase
        .from("pomodoro_sessions")
        .select(
            "started_at, total_work_time, total_break_time, total_pause_time",
        )
        .eq("user_id", userId)
        .gte("started_at", queryStartDateStr);

    const focusPowerAggMap = new Map<
        string,
        { work: number; breakTime: number; pause: number }
    >();

    sessionsData?.forEach((s) => {
        const dateKey = getVirtualDateKey(new Date(s.started_at));
        const workSec = s.total_work_time || 0;
        const breakSec = s.total_break_time || 0;
        const pauseSec = s.total_pause_time || 0;

        if (!focusPowerAggMap.has(dateKey)) {
            focusPowerAggMap.set(dateKey, { work: 0, breakTime: 0, pause: 0 });
        }
        const entry = focusPowerAggMap.get(dateKey)!;
        entry.work += workSec;
        entry.breakTime += breakSec;
        entry.pause += pauseSec;
    });

    // Calculate points based on range
    const assembleData = (targetCount: number) => {
        const result: FocusPowerPoint[] = [];
        const loopCount = targetCount;

        for (let i = loopCount - 1; i >= 0; i--) {
            const d = new Date();
            d.setHours(12, 0, 0, 0);
            d.setDate(d.getDate() - i);
            const dateKey = getVirtualDateKey(d);

            const agg = focusPowerAggMap.get(dateKey) ||
                { work: 0, breakTime: 0, pause: 0 };
            const score = calculateFocusPower(
                agg.work,
                agg.breakTime,
                agg.pause,
            );

            const dayName = d.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
            });

            // Filter out empty days if range is large, or keep all if range is small (week/month)
            // User requested filling gaps, so we default to fill, unless for 'all' time specialized logic
            result.push({
                date: dayName,
                originalDate: d.toISOString(),
                score: score,
                workMinutes: Math.round(agg.work / 60),
                breakMinutes: Math.round(agg.breakTime / 60),
                pauseMinutes: Math.round(agg.pause / 60),
            });
        }
        return result;
    };

    if (range === "week") return assembleData(7);
    if (range === "month") return assembleData(30);

    // For "all" time, we aggregate by month
    const allTimeFocus: FocusPowerPoint[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        d.setDate(1); // First day of the month

        let mWork = 0, mBreak = 0, mPause = 0;

        // Iterate map to sum up for this month
        for (const [key, val] of focusPowerAggMap.entries()) {
            const keyDate = new Date(key);
            if (
                keyDate.getMonth() === d.getMonth() &&
                keyDate.getFullYear() === d.getFullYear()
            ) {
                mWork += val.work;
                mBreak += val.breakTime;
                mPause += val.pause;
            }
        }

        const score = calculateFocusPower(mWork, mBreak, mPause);
        const monthName = d.toLocaleDateString("tr-TR", { month: "long" });

        allTimeFocus.push({
            date: monthName,
            originalDate: d.toISOString(),
            score: score,
            workMinutes: Math.round(mWork / 60),
            breakMinutes: Math.round(mBreak / 60),
            pauseMinutes: Math.round(mPause / 60),
        });
    }

    return allTimeFocus;
}

export async function getConsistencyData({
    userId,
    days = 30,
}: {
    userId: string;
    days?: number;
}): Promise<DayActivity[]> {
    const queryStartDate = new Date();
    queryStartDate.setMonth(queryStartDate.getMonth() - 6);
    const queryStartDateStr = queryStartDate.toISOString();

    const { data: sessionsData } = await supabase
        .from("pomodoro_sessions")
        .select("started_at, total_work_time")
        .eq("user_id", userId)
        .gte("started_at", queryStartDateStr);

    const dailyMap = new Map<string, number>();

    sessionsData?.forEach((s) => {
        const dateKey = getVirtualDateKey(new Date(s.started_at));
        const mins = Math.round((s.total_work_time || 0) / 60);
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + mins);
    });

    const rawHeatmap: DayActivity[] = [];
    // Generate slightly more than needed to detect streaks/breaks at edges if needed
    const loopDays = days + 14;

    for (let i = loopDays; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(12, 0, 0, 0);

        const dateKey = getVirtualDateKey(d);
        const mins = dailyMap.get(dateKey) || 0;

        rawHeatmap.push({
            date: dateKey,
            totalMinutes: mins,
            count: mins > 0 ? 1 : 0,
            level: 0,
            intensity: 0,
        });
    }

    // Filter Logic: "Empty days" on weekends might be ignored if adjacent days have work (Optional logic from original code preserved)
    const filteredHeatmap = rawHeatmap.filter((day, idx, arr) => {
        const [y, m, dt] = day.date.split("-").map(Number);
        const d = new Date(y, m - 1, dt);
        const dayOfWeek = d.getDay();
        const mins = day.totalMinutes || 0;

        if (mins === 0) {
            if (dayOfWeek === 6) { // Saturday
                const nextDay = arr[idx + 1];
                if (nextDay && (nextDay.totalMinutes || 0) > 0) return false;
            }
            if (dayOfWeek === 0) { // Sunday
                const prevDay = arr[idx - 1];
                if (prevDay && (prevDay.totalMinutes || 0) > 0) return false;
            }
        }
        return true;
    });

    return filteredHeatmap.slice(-days).map((item) => ({
        ...item,
        level: 0,
        intensity: 0,
    }));
}
