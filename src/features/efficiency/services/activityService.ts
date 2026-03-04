import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import { getVirtualDayStart } from '@/utils/dateUtils';
import type { Database } from '@/types/database.types';
import type {
  PomodoroInsert,
  VideoUpsert,
} from '@/features/pomodoro/types/pomodoroTypes';
import type { DailyStats } from '@/features/efficiency/types/efficiencyTypes';
import { processDailyStats, type RawVideo } from './efficiencyCoreService';

// ==========================================
// === TYPES ===
// ==========================================

export type QuizProgressData = {
  course_id: string;
  question_id: string;
  chunk_id?: string | null;
  response_type?: string;
  session_number?: number;
  ai_diagnosis?: string | null;
  ai_insight?: string | null;
};

export type ActivityData = PomodoroInsert | VideoUpsert | QuizProgressData;

type DailyStatsSessionRow = {
  started_at: string;
  total_work_time: number | null;
  total_break_time?: number | null;
  total_pause_time?: number | null;
  timeline?: unknown;
};

type DailyStatsVideoComparisonRow = {
  video_id: string | null;
};

// ==========================================
// === LOGGING FUNCTIONS ===
// ==========================================

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
          item_type: 'video',
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
    console.error('[ActivityService][logActivity] Hata:', err);
    return false;
  }
}

// ==========================================
// === DB FETCHING FUNCTIONS ===
// ==========================================

/**
 * Get daily statistics fetching logic.
 *
 * @param userId User ID
 * @returns Daily statistics
 */
export async function getDailyStats(userId: string): Promise<DailyStats> {
  try {
    const today = getVirtualDayStart();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Fetch Today's Pomodoro Stats
    const { data: todaySessions } = await safeQuery<DailyStatsSessionRow[]>(
      supabase
        .from('pomodoro_sessions')
        .select(
          'started_at, total_work_time, total_break_time, total_pause_time, timeline'
        )
        .eq('user_id', userId)
        .gte('started_at', today.toISOString())
        .lt('started_at', tomorrow.toISOString())
        .or('total_work_time.gte.60,total_break_time.gte.60'),
      'Error fetching today pomodoro stats'
    );

    // 2. Fetch Yesterday's Pomodoro Stats (for Trend)
    const { data: yesterdaySessions } = await safeQuery<DailyStatsSessionRow[]>(
      supabase
        .from('pomodoro_sessions')
        .select('started_at, total_work_time')
        .eq('user_id', userId)
        .gte('started_at', yesterday.toISOString())
        .lt('started_at', today.toISOString()),
      'Error fetching yesterday pomodoro stats'
    );

    // 3. Fetch Video Stats (Today & Yesterday)
    const { data: todayVideos } = await safeQuery<RawVideo[]>(
      supabase
        .from('video_progress')
        .select('video_id, video:videos(duration_minutes, duration)')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', today.toISOString())
        .lt('completed_at', tomorrow.toISOString()),
      'Error fetching today videos'
    );

    const { data: yesterdayVideos } = await safeQuery<
      DailyStatsVideoComparisonRow[]
    >(
      supabase
        .from('video_progress')
        .select('video_id')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', yesterday.toISOString())
        .lt('completed_at', today.toISOString()),
      'Error fetching yesterday videos'
    );

    // Pass the raw data to the core service for processing logic
    return processDailyStats(
      todaySessions || [],
      yesterdaySessions || [],
      todayVideos || [],
      yesterdayVideos || []
    );
  } catch (error) {
    console.error('[ActivityService][getDailyStats] Hata:', error);
    // Return a safe default to not crash the UI
    return processDailyStats([], [], [], []);
  }
}
