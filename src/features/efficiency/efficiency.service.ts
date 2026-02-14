import { supabase } from '@/services/supabase';
import type { Database } from '@/types/database.types';
import {
  calculateFocusPower,
  calculateLearningFlow,
  getCycleCount,
} from '@/utils/math';
import {
  getVirtualDateKey,
  getVirtualDayStart,
} from '@/utils/helpers';
import type { Json } from '@/types/database.types';
import { logger } from '@/utils/logger';
import type {
  DailyEfficiencySummary,
  DetailedSession,
  EfficiencyData,
  EfficiencyTrend,
  FocusTrend,
} from '@/types';

/**
 * Get efficiency ratio (video time vs pomodoro time).
 *
 * @param userId User ID
 * @returns Efficiency data
 */
export async function getEfficiencyRatio(
  userId: string
): Promise<EfficiencyData> {
  const today = getVirtualDayStart();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Fetch Today's Pomodoro Stats
  const { data: todaySessions, error: sessionError } = await supabase
    .from('pomodoro_sessions')
    .select('total_work_time, total_break_time, started_at, ended_at')
    .eq('user_id', userId)
    .gte('started_at', today.toISOString())
    .lt('started_at', tomorrow.toISOString())
    .or('total_work_time.gte.60,total_break_time.gte.60');

  // 2. Fetch Today's Video Stats
  const { data: todayVideos, error: videoError } = await supabase
    .from('video_progress')
    .select('video_id, completed_at, video:videos(duration_minutes)')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', today.toISOString())
    .lt('completed_at', tomorrow.toISOString());

  // 3. Fetch Today's Quiz Progress
  const { data: todayQuiz } = await supabase
    .from('user_quiz_progress')
    .select('answered_at')
    .eq('user_id', userId)
    .gte('answered_at', today.toISOString())
    .lt('answered_at', tomorrow.toISOString());

  if (sessionError || videoError) {
    logger.error('Error fetching efficiency metrics:', {
      sessionError: sessionError?.message,
      videoError: videoError?.message,
    });
  }

  const sessions =
    (todaySessions as Database['public']['Tables']['pomodoro_sessions']['Row'][]) ||
    [];
  const totalWork =
    sessions.reduce((acc: number, s) => acc + (s.total_work_time || 0), 0) || 0;

  let totalVideoMinutes = 0;
  if (todayVideos) {
    totalVideoMinutes = todayVideos.reduce((acc: number, vp) => {
      const video = vp.video as { duration_minutes?: number } | null;
      const duration = video?.duration_minutes || 0;
      return acc + duration;
    }, 0);
  }

  // Quiz Filtering Logic
  let quizSessionMinutes = 0;

  if (todayQuiz && todayQuiz.length > 0) {
    sessions.forEach((session) => {
      const start = new Date(session.started_at).getTime();
      const end = session.ended_at
        ? new Date(session.ended_at).getTime()
        : start +
          ((session.total_work_time || 0) +
            (session.total_break_time || 0) * 1000);

      const questionsInSession = todayQuiz.filter((q) => {
        if (!q.answered_at) return false;
        const t = new Date(q.answered_at).getTime();
        return t >= start && t <= end;
      }).length;

      const videosInSession =
        todayVideos?.filter((v) => {
          if (!v.completed_at) return false;
          const t = new Date(v.completed_at).getTime();
          return t >= start && t <= end;
        }).length || 0;

      if (questionsInSession >= 5 && videosInSession === 0) {
        quizSessionMinutes += Math.round((session.total_work_time || 0) / 60);
      }
    });
  }

  const totalWorkMinutes = Math.round(totalWork / 60);

  const effectiveWorkMinutes = Math.max(
    totalVideoMinutes,
    totalWorkMinutes - quizSessionMinutes
  );

  const ratio =
    effectiveWorkMinutes > 0
      ? Math.round((totalVideoMinutes / effectiveWorkMinutes) * 10) / 10
      : 0.0;

  const efficiencyScore = calculateLearningFlow(
    effectiveWorkMinutes,
    totalVideoMinutes
  );

  return {
    ratio,
    efficiencyScore,
    trend: 'stable',
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
  const thirtyDaysAgo = getVirtualDayStart();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString();

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('started_at, total_work_time')
    .eq('user_id', userId)
    .gte('started_at', dateStr)
    .order('started_at', { ascending: true });

  if (error || !data) return [];

  const dailyMap: Record<string, number> = {};

  data.forEach((s) => {
    const day = s.started_at.split('T')[0];
    dailyMap[day] = (dailyMap[day] || 0) + (s.total_work_time || 0);
  });

  return Object.entries(dailyMap)
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
  userId: string
): Promise<EfficiencyTrend[]> {
  const thirtyDaysAgo = getVirtualDayStart();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString();

  const { data: sessions, error: sessionError } = await supabase
    .from('pomodoro_sessions')
    .select('started_at, total_work_time')
    .eq('user_id', userId)
    .gte('started_at', dateStr);

  const { data: videoProgress, error: videoError } = await supabase
    .from('video_progress')
    .select('completed_at, video:videos(duration_minutes)')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', dateStr);

  if (sessionError || videoError) return [];

  const dailyMap: Record<
    string,
    { workSeconds: number; videoMinutes: number }
  > = {};

  sessions?.forEach((s) => {
    if (!s.started_at) return;
    const d = new Date(s.started_at);
    const day = getVirtualDateKey(d);
    if (!dailyMap[day]) dailyMap[day] = { workSeconds: 0, videoMinutes: 0 };
    dailyMap[day].workSeconds += Number(s.total_work_time || 0);
  });

  videoProgress?.forEach((vp) => {
    if (!vp.completed_at) return;
    const d = new Date(vp.completed_at);
    const day = getVirtualDateKey(d);

    const video = (Array.isArray(vp.video) ? vp.video[0] : vp.video) as {
      duration_minutes?: number;
    } | null;
    if (!video) return;

    const duration = video.duration_minutes || 0;

    if (!dailyMap[day]) dailyMap[day] = { workSeconds: 0, videoMinutes: 0 };
    dailyMap[day].videoMinutes += Number(duration);
  });

  return Object.entries(dailyMap)
    .map(([date, stats]) => {
      const workSeconds = stats.workSeconds;
      const videoMinutes = stats.videoMinutes;

      let multiplier = 0;
      if (workSeconds > 0) {
        multiplier = videoMinutes / (workSeconds / 60);
      }

      return {
        date,
        score: Number(multiplier.toFixed(2)),
        workMinutes: Math.round(workSeconds / 60),
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
  userId: string
): Promise<DailyEfficiencySummary> {
  const today = getVirtualDayStart();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: todaySessions, error } = await supabase
    .from('pomodoro_sessions')
    .select(
      'id, course_name, started_at, total_work_time, total_break_time, total_pause_time, pause_count, efficiency_score, timeline'
    )
    .eq('user_id', userId)
    .gte('started_at', today.toISOString())
    .lt('started_at', tomorrow.toISOString())
    .or('total_work_time.gte.60,total_break_time.gte.60')
    .order('started_at', { ascending: true });

  if (error) {
    logger.error('Error fetching daily efficiency summary:', error);
  }

  const sessionsData = todaySessions || [];

  // Calculate aggregates
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
      courseName: s.course_name || 'Bilinmeyen Ders',
      workTimeSeconds: work,
      breakTimeSeconds: brk,
      pauseTimeSeconds: pause,
      efficiencyScore: eff,
      timeline: Array.isArray(s.timeline) ? (s.timeline as Json[]) : [],
      startedAt: s.started_at,
    };
  });

  // Calculate daily total Focus Power (Odak Gücü)
  const dailyFocusPower = calculateFocusPower(
    totalWork,
    totalBreak,
    totalPause
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
