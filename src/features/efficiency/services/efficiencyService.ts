import { supabase } from "@/lib/supabase";
import {
  calculateFocusPower,
  calculateLearningFlow,
  getCycleCount,
} from "@/utils/math";
import { getVirtualDateKey, getVirtualDayStart } from "@/utils/helpers";
import type { Json } from "@/types/database.types";
import { logger } from "@/utils/logger";
import type {
  DailyEfficiencySummary,
  DayActivity,
  DetailedSession,
  EfficiencyData,
  EfficiencyTrend,
  FocusTrend,
} from "@/types";
import type { FocusPowerPoint, LearningLoad } from "../types/efficiencyTypes";
import { generateDateRange } from "../utils/efficiencyUtils";

/**
 * Get efficiency ratio (video time vs pomodoro time).
 *
 * @param userId User ID
 * @returns Efficiency data
 */
export async function getEfficiencyRatio(
  userId: string,
): Promise<EfficiencyData> {
  const today = getVirtualDayStart();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Fetch Today's Pomodoro Stats (Optimized Selection)
  const { data: todaySessions, error: sessionError } = await supabase
    .from("pomodoro_sessions")
    .select("total_work_time, started_at, ended_at")
    .eq("user_id", userId)
    .gte("started_at", today.toISOString())
    .lt("started_at", tomorrow.toISOString())
    .or("total_work_time.gte.60,total_break_time.gte.60");

  // 2. Fetch Today's Video Stats (Optimized Selection)
  const { data: todayVideos, error: videoError } = await supabase
    .from("video_progress")
    .select("completed_at, video:videos(duration_minutes)")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("completed_at", today.toISOString())
    .lt("completed_at", tomorrow.toISOString());

  // 3. Fetch Today's Quiz Progress (Optimized Selection)
  const { data: todayQuiz } = await supabase
    .from("user_quiz_progress")
    .select("answered_at")
    .eq("user_id", userId)
    .gte("answered_at", today.toISOString())
    .lt("answered_at", tomorrow.toISOString());

  if (sessionError || videoError) {
    logger.error("Error fetching efficiency metrics:", {
      sessionError: sessionError?.message,
      videoError: videoError?.message,
    });
  }

  const sessions = todaySessions || [];

  // Calculate total work time
  const totalWork =
    sessions.reduce((acc, s) => acc + (s.total_work_time || 0), 0) || 0;

  // Calculate total video minutes
  let totalVideoMinutes = 0;
  if (todayVideos) {
    totalVideoMinutes = todayVideos.reduce((acc, vp) => {
      const video = vp.video as { duration_minutes?: number } | null;
      return acc + (video?.duration_minutes || 0);
    }, 0);
  }

  // Quiz Filtering Logic - Optimized with specific checks instead of heavy filtering inside loop if possible
  let quizSessionMinutes = 0;

  if (todayQuiz && todayQuiz.length > 0 && sessions.length > 0) {
    const quizTimestamps = todayQuiz
      .map((q) => q.answered_at ? new Date(q.answered_at).getTime() : 0)
      .filter((t) => t > 0)
      .sort((a, b) => a - b);

    // Optimization: If no quizzes, skip
    if (quizTimestamps.length > 0) {
      sessions.forEach((session) => {
        const start = new Date(session.started_at).getTime();
        // Estimate end if not present (fallback logic preserved)
        const end = session.ended_at
          ? new Date(session.ended_at).getTime()
          : start + ((session.total_work_time || 0) * 1000); // Only adding work time as approximation if needed

        // Count quizzes in this range (Binary search could be O(log M) but linear scan on small daily array is fine)
        let questionsInSession = 0;
        for (const t of quizTimestamps) {
          if (t >= start && t <= end) questionsInSession++;
        }

        // Count videos in this range
        let videosInSession = 0;
        if (todayVideos) {
          for (const v of todayVideos) {
            if (!v.completed_at) continue;
            const t = new Date(v.completed_at).getTime();
            if (t >= start && t <= end) videosInSession++;
          }
        }

        if (questionsInSession >= 5 && videosInSession === 0) {
          quizSessionMinutes += Math.round((session.total_work_time || 0) / 60);
        }
      });
    }
  }

  const totalWorkMinutes = Math.round(totalWork / 60);

  const effectiveWorkMinutes = Math.max(
    totalVideoMinutes,
    totalWorkMinutes - quizSessionMinutes,
  );

  const ratio = effectiveWorkMinutes > 0
    ? Math.round((totalVideoMinutes / effectiveWorkMinutes) * 10) / 10
    : 0.0;

  const efficiencyScore = calculateLearningFlow(
    effectiveWorkMinutes,
    totalVideoMinutes,
  );

  return {
    ratio,
    efficiencyScore,
    trend: "stable",
    isAlarm: ratio > 2.5,
    videoMinutes: Math.round(totalVideoMinutes),
    pomodoroMinutes: totalWorkMinutes,
    quizMinutes: quizSessionMinutes,
  };
}

/**
 * Get focus trend (work time) over the last 30 days.
 *
 * @param userId User ID
 * @returns Array of focus trend data
 */
export async function getFocusTrend(userId: string): Promise<FocusTrend[]> {
  const daysToCheck = 30;
  const thirtyDaysAgo = getVirtualDayStart();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - daysToCheck);
  const dateStr = thirtyDaysAgo.toISOString();

  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("started_at, total_work_time")
    .eq("user_id", userId)
    .gte("started_at", dateStr);

  if (error || !data) return [];

  // O(N) Aggregation
  const dailyMap = new Map<string, number>();

  // Pre-fill dates to ensure no gaps (User Request: fill gaps)
  const dateRange = generateDateRange(daysToCheck);
  dateRange.forEach((date) => dailyMap.set(date, 0));

  data.forEach((s) => {
    const day = getVirtualDateKey(new Date(s.started_at));
    // Verify day is within range before adding (it should be due to query, but safe check)
    if (dailyMap.has(day)) {
      dailyMap.set(day, (dailyMap.get(day) || 0) + (s.total_work_time || 0));
    }
  });

  return Array.from(dailyMap.entries())
    .map(([date, seconds]) => ({
      date,
      minutes: Math.round(seconds / 60),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get efficiency trend over the last 30 days.
 *
 * @param userId User ID
 * @returns Array of efficiency trend data
 */
export async function getEfficiencyTrend(
  userId: string,
): Promise<EfficiencyTrend[]> {
  const daysToCheck = 30;
  const thirtyDaysAgo = getVirtualDayStart();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - daysToCheck);
  const dateStr = thirtyDaysAgo.toISOString();

  const [{ data: sessions }, { data: videoProgress }] = await Promise.all([
    supabase
      .from("pomodoro_sessions")
      .select("started_at, total_work_time")
      .eq("user_id", userId)
      .gte("started_at", dateStr),
    supabase
      .from("video_progress")
      .select("completed_at, video:videos(duration_minutes)")
      .eq("user_id", userId)
      .eq("completed", true)
      .gte("completed_at", dateStr),
  ]);

  // Map for O(1) access
  const dailyMap = new Map<
    string,
    { workSeconds: number; videoMinutes: number }
  >();

  // Fill gaps
  const dateRange = generateDateRange(daysToCheck);
  dateRange.forEach((date) =>
    dailyMap.set(date, { workSeconds: 0, videoMinutes: 0 })
  );

  sessions?.forEach((s) => {
    const day = getVirtualDateKey(new Date(s.started_at));
    if (dailyMap.has(day)) {
      const entry = dailyMap.get(day)!;
      entry.workSeconds += s.total_work_time || 0;
    }
  });

  videoProgress?.forEach((vp) => {
    if (!vp.completed_at) return;
    const day = getVirtualDateKey(new Date(vp.completed_at));

    // Handle array or single object for joined video data
    const video = (Array.isArray(vp.video) ? vp.video[0] : vp.video) as {
      duration_minutes?: number;
    } | null;
    const duration = video?.duration_minutes || 0;

    if (dailyMap.has(day)) {
      const entry = dailyMap.get(day)!;
      entry.videoMinutes += duration;
    }
  });

  return Array.from(dailyMap.entries())
    .map(([date, stats]) => {
      const workSeconds = stats.workSeconds;
      const videoMinutes = stats.videoMinutes;
      const workMinutes = workSeconds / 60;

      let multiplier = 0;
      if (workSeconds > 0) {
        multiplier = videoMinutes / workMinutes;
      }

      return {
        date,
        score: Number(multiplier.toFixed(2)),
        workMinutes: Math.round(workMinutes),
        videoMinutes: Math.round(videoMinutes),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get daily efficiency summary for the master card.
 *
 * @param userId User ID
 * @returns Daily efficiency summary
 */
export async function getDailyEfficiencySummary(
  userId: string,
): Promise<DailyEfficiencySummary> {
  const today = getVirtualDayStart();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: todaySessions, error } = await supabase
    .from("pomodoro_sessions")
    .select(
      "id, course_name, started_at, total_work_time, total_break_time, total_pause_time, pause_count, efficiency_score, timeline",
    )
    .eq("user_id", userId)
    .gte("started_at", today.toISOString())
    .lt("started_at", tomorrow.toISOString())
    .or("total_work_time.gte.60,total_break_time.gte.60")
    .order("started_at", { ascending: true });

  if (error) {
    logger.error("Error fetching daily efficiency summary:", error);
  }

  const sessionsData = todaySessions || [];

  let totalWork = 0;
  let totalBreak = 0;
  let totalPause = 0;
  let totalPauseCount = 0;
  let totalCycles = 0;

  const detailedSessions: DetailedSession[] = sessionsData.map((s) => {
    const work = s.total_work_time || 0;
    const brk = s.total_break_time || 0;
    const pause = s.total_pause_time || 0;
    const eff = s.efficiency_score || 0;
    const pCount = s.pause_count || 0;

    totalWork += work;
    totalBreak += brk;
    totalPause += pause;
    totalPauseCount += pCount;
    totalCycles += getCycleCount(s.timeline);

    return {
      id: s.id,
      courseName: s.course_name || "Bilinmeyen Ders",
      workTimeSeconds: work,
      breakTimeSeconds: brk,
      pauseTimeSeconds: pause,
      efficiencyScore: eff,
      timeline: Array.isArray(s.timeline) ? (s.timeline as Json[]) : [],
      startedAt: s.started_at,
    };
  });

  const dailyFocusPower = calculateFocusPower(
    totalWork,
    totalBreak,
    totalPause,
  );

  return {
    efficiencyScore: dailyFocusPower,
    totalCycles,
    netWorkTimeSeconds: totalWork,
    totalBreakTimeSeconds: totalBreak,
    totalPauseTimeSeconds: totalPause,
    pauseCount: totalPauseCount,
    sessions: detailedSessions,
  };
}

interface LearningLoadParams {
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
    .select("started_at, total_work_time, total_break_time, total_pause_time")
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
      const score = calculateFocusPower(agg.work, agg.breakTime, agg.pause);

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
