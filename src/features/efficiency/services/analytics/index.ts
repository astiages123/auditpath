// Re-export all analytics services for easier imports
export * from '../efficiencyTrendService';

// Additional analytics functions that might be needed
import { supabase } from '@/lib/supabase';
import { getVirtualDateKey, getVirtualDayStart } from '@/utils/dateHelpers';
import {
  DayActivity,
  LearningLoad,
  FocusPowerPoint,
} from '@/features/efficiency/types/efficiencyTypes';

export async function getConsistencyData({
  userId,
  days,
}: {
  userId: string;
  days: number;
}): Promise<DayActivity[]> {
  const startDate = getVirtualDayStart();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('started_at, total_work_time')
    .eq('user_id', userId)
    .gte('started_at', startDate.toISOString());

  if (error || !data) return [];

  const activityMap = new Map<string, number>();

  // Pre-fill with empty days
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    activityMap.set(getVirtualDateKey(d), 0);
  }

  data.forEach((session) => {
    const day = getVirtualDateKey(new Date(session.started_at));
    activityMap.set(
      day,
      (activityMap.get(day) || 0) + (session.total_work_time || 0)
    );
  });

  return Array.from(activityMap.entries())
    .map(([date, seconds]) => {
      const minutes = Math.round(seconds / 60);
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      let intensity = 0;

      if (minutes > 200) {
        level = 4;
        intensity = 1;
      } else if (minutes > 150) {
        level = 3;
        intensity = 0.75;
      } else if (minutes > 100) {
        level = 2;
        intensity = 0.5;
      } else if (minutes > 50) {
        level = 1;
        intensity = 0.25;
      }

      return {
        date,
        count: Math.round(minutes / 60),
        level,
        intensity,
        totalMinutes: minutes,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getLearningLoadData({
  userId,
  days,
}: {
  userId: string;
  days: number;
}): Promise<LearningLoad[]> {
  const startDate = getVirtualDayStart();
  startDate.setDate(startDate.getDate() - days);

  const [{ data: sessions }, { data: videoProgress }] = await Promise.all([
    supabase
      .from('pomodoro_sessions')
      .select('started_at, total_work_time')
      .eq('user_id', userId)
      .gte('started_at', startDate.toISOString()),
    supabase
      .from('video_progress')
      .select('completed_at, video:videos(duration_minutes)')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', startDate.toISOString()),
  ]);

  const loadMap = new Map<string, { video: number; extra: number }>();

  // Pre-fill dates
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    loadMap.set(getVirtualDateKey(d), { video: 0, extra: 0 });
  }

  // Add video time
  videoProgress?.forEach((vp) => {
    if (!vp.completed_at) return;
    const day = getVirtualDateKey(new Date(vp.completed_at));
    const video = (Array.isArray(vp.video) ? vp.video[0] : vp.video) as {
      duration_minutes?: number;
    } | null;
    const duration = video?.duration_minutes || 0;

    if (loadMap.has(day)) {
      const entry = loadMap.get(day)!;
      entry.video += duration;
    }
  });

  // Add extra study time (pomodoro work time counts as extra)
  sessions?.forEach((s) => {
    const day = getVirtualDateKey(new Date(s.started_at));
    if (loadMap.has(day)) {
      const entry = loadMap.get(day)!;
      entry.extra += Math.round((s.total_work_time || 0) / 60);
    }
  });

  return Array.from(loadMap.entries())
    .map(([day, data]) => ({
      day,
      videoMinutes: data.video,
      extraStudyMinutes: data.extra,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export async function getFocusPowerData({
  userId,
  range,
}: {
  userId: string;
  range: 'week' | 'month' | 'all';
}): Promise<FocusPowerPoint[]> {
  let days = 7;
  if (range === 'month') days = 30;
  if (range === 'all') days = 180;

  const startDate = getVirtualDayStart();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('started_at, total_work_time, total_break_time, total_pause_time')
    .eq('user_id', userId)
    .gte('started_at', startDate.toISOString())
    .order('started_at', { ascending: true });

  if (error || !data) return [];

  const dailyMap = new Map<
    string,
    {
      workMinutes: number;
      breakMinutes: number;
      pauseMinutes: number;
    }
  >();

  data.forEach((session) => {
    const day = getVirtualDateKey(new Date(session.started_at));
    if (!dailyMap.has(day)) {
      dailyMap.set(day, { workMinutes: 0, breakMinutes: 0, pauseMinutes: 0 });
    }
    const entry = dailyMap.get(day)!;
    entry.workMinutes += Math.round((session.total_work_time || 0) / 60);
    entry.breakMinutes += Math.round((session.total_break_time || 0) / 60);
    entry.pauseMinutes += Math.round((session.total_pause_time || 0) / 60);
  });

  return Array.from(dailyMap.entries())
    .map(([date, data]) => {
      const totalTime =
        data.workMinutes + data.breakMinutes + data.pauseMinutes;
      const score =
        totalTime > 0 ? Math.round((data.workMinutes / totalTime) * 100) : 0;

      return {
        date,
        originalDate: date,
        score,
        workMinutes: data.workMinutes,
        breakMinutes: data.breakMinutes,
        pauseMinutes: data.pauseMinutes,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
