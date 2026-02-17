import { supabase } from "@/lib/supabase";
import { calculateFocusPower, getCycleCount } from "@/utils/math";
import { getVirtualDayStart, isValid, parseOrThrow } from "@/utils/helpers";
import { TimelineEventSchema } from "../../types/efficiencyTypes";
import { z } from "zod";
import { handleSupabaseError } from "@/lib/supabaseHelpers";

import type {
  DailyEfficiencySummary,
  DetailedSession,
} from "@/features/efficiency/types/efficiencyTypes";

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
    await handleSupabaseError(error, "getDailyEfficiencySummary");
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

    // Validate timeline structure
    const rawTimeline = s.timeline;
    let validatedTimeline: z.infer<typeof TimelineEventSchema>[] = [];

    if (Array.isArray(rawTimeline)) {
      // We map and validate each item, skipping invalid ones to prevent crash
      validatedTimeline = rawTimeline
        .map((item) => {
          if (isValid(TimelineEventSchema, item)) {
            return parseOrThrow(TimelineEventSchema, item);
          }
          return null;
        })
        .filter((t): t is z.infer<typeof TimelineEventSchema> => t !== null);
    }

    return {
      id: s.id,
      courseName: s.course_name || "Bilinmeyen Ders",
      workTimeSeconds: work,
      breakTimeSeconds: brk,
      pauseTimeSeconds: pause,
      efficiencyScore: eff,
      timeline: validatedTimeline,
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
