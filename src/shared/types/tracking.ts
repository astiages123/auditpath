import type { Json } from './supabase';

export interface PomodoroInsert {
  course_id: string;
  course_name?: string | null;
  started_at: string;
  ended_at: string;
  total_work_time?: number | null;
  total_break_time?: number | null;
  total_pause_time?: number | null;
  timeline?: Json; // Matches Json type in DB
  notes?: string;
}

export interface VideoUpsert {
  video_id: string;
  course_id?: string;
  completed?: boolean;
  completed_at?: string | null;
  progress_seconds?: number;
  last_watched_at?: string;
}

export interface QuizInsert {
  question_id: string;
  course_id: string;
  chunk_id?: string | null;
  is_correct?: boolean;
  confidence_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  answered_at?: string | null;
  response_time_ms?: number | null;
  response_type: 'correct' | 'incorrect' | 'blank';
  session_number: number;
  ai_diagnosis?: string | null;
  ai_insight?: string | null;
}

export type ActivityData = PomodoroInsert | VideoUpsert | QuizInsert;

export interface RecentActivity {
  id: string;
  type: 'pomodoro' | 'video' | 'quiz';
  title: string;
  date: string;
  durationMinutes?: number;
}
