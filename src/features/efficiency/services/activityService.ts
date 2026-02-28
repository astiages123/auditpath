import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import { getCycleCount } from '@/features/pomodoro/logic/sessionMath';
import type {
  PomodoroInsert,
  RecentActivity,
  VideoUpsert,
} from '@/features/pomodoro/types/pomodoroTypes';
import type {
  CumulativeStats,
  DailyStats,
  DayActivity,
  HistoryStats,
} from '@/features/efficiency/types/efficiencyTypes';
import type { Database } from '@/types/database.types';
import { logger } from '@/utils/logger';
import { VIRTUAL_DAY_START_HOUR } from '@/utils/constants';
import {
  formatDateKey,
  getVirtualDate,
  getVirtualDayStart,
} from '@/utils/dateUtils';
import { EFFICIENCY_CONFIG } from '../utils/constants';

// ============== TYPES ==============

interface PomodoroSessionRow {
  id: string;
  started_at: string;
  course_name: string | null;
  total_work_time: number | null;
}

interface VideoProgressRow {
  id: string;
  completed_at: string | null;
  video: { title: string } | null;
}

interface QuizProgressRow {
  id: string;
  answered_at: string | null;
  course: { name: string } | null;
}

type QuizProgressData = {
  course_id: string;
  question_id: string;
  chunk_id?: string | null;
  response_type?: string;
  session_number?: number;
  ai_diagnosis?: string | null;
  ai_insight?: string | null;
};

type ActivityData = PomodoroInsert | VideoUpsert | QuizProgressData;

// ============== UTILITY FUNCTIONS (from activityUtils.ts) ==============

// Re-mapping for internal usage without refactoring all calls:
const getVirtualToday = getVirtualDayStart;
const adjustToVirtualDay = getVirtualDate;

// === SECTION === Logging Functions

/**
 * Log a new activity (pomodoro, video, or quiz).
 *
 * @param userId User ID
 * @param type Activity type
 * @param data Activity data
 * @returns true if successful, false otherwise
 */
export async function logActivity(
  userId: string,
  type: 'pomodoro' | 'video' | 'quiz',
  data: ActivityData
): Promise<boolean> {
  try {
    let successFlag = false;
    if (type === 'pomodoro') {
      const pomodoroData = data as PomodoroInsert;
      const insertData: Database['public']['Tables']['pomodoro_sessions']['Insert'] =
        {
          user_id: userId,
          course_id: pomodoroData.course_id,
          course_name: pomodoroData.course_name,
          started_at: pomodoroData.started_at,
          ended_at: pomodoroData.ended_at || new Date().toISOString(),
          timeline: pomodoroData.timeline,
          total_work_time: pomodoroData.total_work_time,
          total_break_time: pomodoroData.total_break_time,
          total_pause_time: pomodoroData.total_pause_time,
        };
      const res = await safeQuery(
        supabase.from('pomodoro_sessions').insert(insertData),
        'Error inserting pomodoro session'
      );
      successFlag = res.success;
    } else if (type === 'video') {
      const videoData = data as VideoUpsert;
      const insertData: Database['public']['Tables']['video_progress']['Insert'] =
        {
          user_id: userId,
          video_id: videoData.video_id,
          completed: videoData.completed,
          completed_at: videoData.completed_at,
        };
      const res = await safeQuery(
        supabase.from('video_progress').upsert(insertData),
        'Error upserting video progress'
      );
      successFlag = res.success;
    } else {
      const quizData = data as QuizProgressData;
      const insertData: Database['public']['Tables']['user_quiz_progress']['Insert'] =
        {
          user_id: userId,
          course_id: quizData.course_id,
          question_id: quizData.question_id,
          chunk_id: quizData.chunk_id || null,
          response_type: (quizData.response_type || 'blank') as
            | 'correct'
            | 'incorrect'
            | 'blank',
          session_number: quizData.session_number || 1,
          ai_diagnosis: quizData.ai_diagnosis || null,
          ai_insight: quizData.ai_insight || null,
        };
      const res = await safeQuery(
        supabase.from('user_quiz_progress').insert(insertData),
        'Error inserting quiz progress'
      );
      successFlag = res.success;
    }

    if (!successFlag) throw new Error('Activity logging failed');
    return true;
  } catch (err) {
    logger.error(`Error logging ${type} activity:`, err as Error);
    return false;
  }
}

// === SECTION === Stats Functions

/**
 * Get daily statistics with virtual day logic (day starts at 04:00).
 *
 * @param userId User ID
 * @returns Daily statistics
 */
export async function getDailyStats(userId: string): Promise<DailyStats> {
  const today = getVirtualToday();

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Fetch Today's Pomodoro Stats
  const { data: todaySessions } = await safeQuery(
    supabase
      .from('pomodoro_sessions')
      .select('total_work_time, total_break_time, total_pause_time, timeline')
      .eq('user_id', userId)
      .gte('started_at', today.toISOString())
      .lt('started_at', tomorrow.toISOString())
      .or('total_work_time.gte.60,total_break_time.gte.60'),
    'Error fetching today pomodoro stats'
  );

  // 2. Fetch Yesterday's Pomodoro Stats (for Trend)
  const { data: yesterdaySessions } = await safeQuery(
    supabase
      .from('pomodoro_sessions')
      .select('total_work_time')
      .eq('user_id', userId)
      .gte('started_at', yesterday.toISOString())
      .lt('started_at', today.toISOString()),
    'Error fetching yesterday pomodoro stats'
  );

  // 3. Fetch Video Stats (Today & Yesterday)
  const { data: todayVideos } = await safeQuery(
    supabase
      .from('video_progress')
      .select('video_id, video:videos(duration_minutes)')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', today.toISOString())
      .lt('completed_at', tomorrow.toISOString()),
    'Error fetching today videos'
  );

  const { data: yesterdayVideos } = await safeQuery(
    supabase
      .from('video_progress')
      .select('video_id')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', yesterday.toISOString())
      .lt('completed_at', today.toISOString()),
    'Error fetching yesterday videos'
  );

  // DB stores Seconds. UI expects Minutes.
  const todaySessionsData = todaySessions || [];
  const totalWorkSeconds =
    todaySessionsData.reduce((acc, s) => acc + (s.total_work_time || 0), 0) ||
    0;
  const totalBreakSeconds =
    todaySessionsData.reduce((acc, s) => acc + (s.total_break_time || 0), 0) ||
    0;
  const totalPauseSeconds =
    todaySessionsData.reduce((acc, s) => acc + (s.total_pause_time || 0), 0) ||
    0;

  // Calculate total cycles
  const totalCycles = todaySessionsData.reduce(
    (acc, s) => acc + getCycleCount(s.timeline),
    0
  );

  const totalWorkMinutes = Math.round(totalWorkSeconds / 60);
  const totalBreakMinutes = Math.round(totalBreakSeconds / 60);
  const totalPauseMinutes = Math.round(totalPauseSeconds / 60);

  const sessionCount = totalCycles;

  const yesterdayWorkSeconds =
    yesterdaySessions?.reduce((acc, s) => acc + (s.total_work_time || 0), 0) ||
    0;
  const yesterdayWorkMinutes = Math.round(yesterdayWorkSeconds / 60);

  // Calculate Trend
  let trendPercentage = 0;
  if (yesterdayWorkMinutes === 0) {
    trendPercentage = totalWorkMinutes > 0 ? 100 : 0;
  } else {
    trendPercentage = Math.round(
      ((totalWorkMinutes - yesterdayWorkMinutes) / yesterdayWorkMinutes) * 100
    );
  }

  // Calculate Video Stats
  let totalVideoMinutes = 0;
  const completedVideosCount = todayVideos?.length || 0;

  if (todayVideos) {
    totalVideoMinutes = todayVideos.reduce((acc, vp) => {
      const duration =
        (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
      return acc + duration;
    }, 0);
  }

  const yesterdayVideoCount = yesterdayVideos?.length || 0;
  let videoTrendPercentage = 0;
  if (yesterdayVideoCount === 0) {
    videoTrendPercentage = completedVideosCount > 0 ? 100 : 0;
  } else {
    videoTrendPercentage = Math.round(
      ((completedVideosCount - yesterdayVideoCount) / yesterdayVideoCount) * 100
    );
  }

  const goalMinutes = EFFICIENCY_CONFIG.DAILY_GOAL_MINUTES;
  const progress = Math.min(
    100,
    Math.round((totalWorkMinutes / goalMinutes) * 100)
  );

  return {
    totalWorkMinutes,
    totalBreakMinutes,
    sessionCount,
    goalMinutes,
    progress,
    goalPercentage: progress,
    trendPercentage,
    dailyGoal: goalMinutes,
    totalPauseMinutes,
    totalVideoMinutes: Math.round(totalVideoMinutes),
    completedVideos: completedVideosCount,
    videoTrendPercentage,
    totalCycles,
  };
}

/**
 * Get cumulative statistics (all-time).
 *
 * @param userId User ID
 * @returns Cumulative statistics
 */
export async function getCumulativeStats(
  userId: string
): Promise<CumulativeStats> {
  // 1. Total Pomodoro
  const { data: allSessions } = await safeQuery(
    supabase
      .from('pomodoro_sessions')
      .select('total_work_time')
      .eq('user_id', userId),
    'Error fetching cumulative pomodoro stats'
  );

  // 2. Total Video
  const { data: allVideos } = await safeQuery(
    supabase
      .from('video_progress')
      .select('video_id, video:videos(duration_minutes)')
      .eq('user_id', userId)
      .eq('completed', true),
    'Error fetching cumulative video stats'
  );

  const totalWorkSeconds =
    allSessions?.reduce((acc, s) => acc + (s.total_work_time || 0), 0) || 0;
  const totalWorkMinutes = Math.round(totalWorkSeconds / 60);

  let totalVideoMinutes = 0;
  if (allVideos) {
    totalVideoMinutes = allVideos.reduce((acc, vp) => {
      const duration =
        (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
      return acc + duration;
    }, 0);
  }

  const ratio =
    totalVideoMinutes > 0
      ? Math.round((totalWorkMinutes / totalVideoMinutes) * 10) / 10
      : 0;

  return {
    totalWorkMinutes,
    totalVideoMinutes: Math.round(totalVideoMinutes),
    ratio,
  };
}

/**
 * Get historical statistics for the last N days.
 *
 * @param userId User ID
 * @param days Number of days to fetch (default: 7)
 * @returns Array of daily history stats
 */
export async function getHistoryStats(
  userId: string,
  days: number = 7
): Promise<HistoryStats[]> {
  const today = getVirtualToday();

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(VIRTUAL_DAY_START_HOUR, 0, 0, 0);

  // 1. Fetch Pomodoro Sessions
  const { data: sessions } = await safeQuery(
    supabase
      .from('pomodoro_sessions')
      .select('started_at, total_work_time')
      .eq('user_id', userId)
      .gte('started_at', startDate.toISOString())
      .or('total_work_time.gte.60,total_break_time.gte.60'),
    'Error fetching pomodoro history'
  );

  // 2. Fetch Video Progress
  const { data: videoProgress } = await safeQuery(
    supabase
      .from('video_progress')
      .select('completed_at, video_id, video:videos(duration_minutes)')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', startDate.toISOString()),
    'Error fetching video history'
  );

  // Group by Date
  const statsMap: Record<string, { pomodoro: number; video: number }> = {};

  // Initialize with 0s for all days
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateKey = formatDateKey(d);
    statsMap[dateKey] = { pomodoro: 0, video: 0 };
  }

  (sessions || []).forEach((s) => {
    const d = adjustToVirtualDay(new Date(s.started_at));
    const dateKey = formatDateKey(d);
    if (statsMap[dateKey]) {
      statsMap[dateKey].pomodoro += s.total_work_time ?? 0;
    }
  });

  videoProgress?.forEach((vp) => {
    if (!vp.completed_at) return;
    const d = adjustToVirtualDay(new Date(vp.completed_at));
    const dateKey = formatDateKey(d);

    if (statsMap[dateKey]) {
      const videoData = vp.video;
      const videoObj = Array.isArray(videoData) ? videoData[0] : videoData;
      const duration =
        (videoObj as { duration_minutes?: number })?.duration_minutes ?? 0;
      statsMap[dateKey].video += duration;
    }
  });

  return Object.entries(statsMap)
    .map(([date, values]) => ({
      date,
      pomodoro: Math.round(values.pomodoro / 60),
      video: Math.round(values.video),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// === SECTION === History Functions

/**
 * Get recent activities across all types.
 *
 * @param userId User ID
 * @param limit Maximum number of activities to return (default: 10)
 * @returns Array of unified activity objects
 */
export async function getRecentActivities(
  userId: string,
  limit: number = 10
): Promise<RecentActivity[]> {
  try {
    const [pomodoro, video, quiz] = await Promise.all([
      safeQuery(
        supabase
          .from('pomodoro_sessions')
          .select('id, course_name, started_at, total_work_time')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(limit),
        'Error fetching recent pomodoros'
      ),
      safeQuery(
        supabase
          .from('video_progress')
          .select('id, completed_at, video:videos(title)')
          .eq('user_id', userId)
          .eq('completed', true)
          .order('completed_at', { ascending: false })
          .limit(limit),
        'Error fetching recent videos'
      ),
      safeQuery(
        supabase
          .from('user_quiz_progress')
          .select('id, answered_at, course:courses(name)')
          .eq('user_id', userId)
          .order('answered_at', { ascending: false })
          .limit(limit),
        'Error fetching recent quizzes'
      ),
    ]);

    const activities: RecentActivity[] = [
      ...(pomodoro.data || []).map((s: PomodoroSessionRow) => ({
        id: s.id,
        type: 'pomodoro' as const,
        date: s.started_at,
        title: s.course_name || 'Odaklanma Seansı',
        durationMinutes: Math.round((s.total_work_time || 0) / 60),
      })),
      ...(video.data || []).map((v: VideoProgressRow) => ({
        id: v.id,
        type: 'video' as const,
        date: v.completed_at || new Date().toISOString(),
        title: v.video?.title || 'Video İzleme',
      })),
      ...(quiz.data || []).map((q: QuizProgressRow) => ({
        id: q.id,
        type: 'quiz' as const,
        date: q.answered_at || new Date().toISOString(),
        title: q.course?.name || 'Konu Testi',
      })),
    ];

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  } catch (err) {
    logger.error('Error fetching recent activities:', err as Error);
    return [];
  }
}

// === SECTION === Visualization Functions

/**
 * Get last 30 days activity heatmap.
 *
 * @param userId User ID
 * @returns Array of daily activity data
 */
export async function getLast30DaysActivity(
  userId: string
): Promise<DayActivity[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const { data, success } = await safeQuery(
    supabase
      .from('pomodoro_sessions')
      .select('started_at, total_work_time')
      .eq('user_id', userId)
      .gte('started_at', thirtyDaysAgo.toISOString())
      .or('total_work_time.gte.60,total_break_time.gte.60'),
    'Error fetching activity heatmap'
  );

  if (!success || !data) {
    return [];
  }

  const dailyCounts: Record<string, { count: number; minutes: number }> = {};
  data.forEach((s) => {
    const d = new Date(s.started_at);
    const dateStr = formatDateKey(d);
    dailyCounts[dateStr] = {
      count: (dailyCounts[dateStr]?.count || 0) + 1,
      minutes: (dailyCounts[dateStr]?.minutes || 0) + (s.total_work_time || 0),
    };
  });

  const heatmap: DayActivity[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (30 - i));
    const dateStr = formatDateKey(d);
    const count = dailyCounts[dateStr]?.count || 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count >= 5) level = 4;
    else if (count >= 3) level = 3;
    else if (count >= 2) level = 2;
    else if (count >= 1) level = 1;

    heatmap.push({
      date: dateStr,
      count,
      level,
      intensity: level,
      totalMinutes: Math.round((dailyCounts[dateStr]?.minutes || 0) / 60),
    });
  }

  return heatmap;
}
