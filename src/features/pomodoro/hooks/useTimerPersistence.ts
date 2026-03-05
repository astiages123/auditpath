import { useEffect } from 'react';
import { env } from '@/utils/env';
import { calculateSessionTotals } from '../logic/sessionMath';
import {
  saveSessionBeacon,
  saveSessionToLocalQueue,
} from '../services/pomodoroService';

// ===========================
// === TYPE DEFINITIONS ===
// ===========================

export interface UseTimerPersistenceProps {
  userId: string | undefined;
  sessionId: string | null;
  selectedCourse: { id: string; name: string } | null;
  timeline: {
    type: 'work' | 'break' | 'pause';
    start: number;
    end?: number | null;
  }[];
  startTime: number | null;
  originalStartTime: number | null;
  accessToken: string | undefined;
}

// ===========================
// === HOOK DEFINITION ===
// ===========================

/**
 * Sends a beacon request with the unwritten pomodoro session data upon browser unload/close.
 * Ensures session tracking remains intact even if the user closes the tab unexpectedly.
 */
export function useTimerPersistence({
  userId,
  sessionId,
  selectedCourse,
  timeline,
  startTime,
  originalStartTime,
  accessToken,
}: UseTimerPersistenceProps) {
  useEffect(() => {
    const handleUnload = () => {
      if (userId && sessionId && selectedCourse && timeline.length > 0) {
        const now = Date.now();
        // Ensure all timeline entries are closed for the safety save
        const closedTimeline = timeline.map((e) => ({
          ...e,
          end: e.end || now,
        }));

        const { totalWork, totalBreak, totalPause } =
          calculateSessionTotals(closedTimeline);
        const payload = {
          id: sessionId,
          user_id: userId,
          course_id: selectedCourse.id,
          course_name: selectedCourse.name,
          timeline: closedTimeline,
          started_at: new Date(
            originalStartTime || startTime || now
          ).toISOString(),
          ended_at: new Date(now).toISOString(),
          total_work_time: totalWork,
          total_break_time: totalBreak,
          total_pause_time: totalPause,
          is_completed: false,
        };

        const supabaseUrl = env.supabase.url;
        const supabaseKey = env.supabase.anonKey;

        if (accessToken) {
          saveSessionBeacon(payload, supabaseUrl, supabaseKey, accessToken);
        } else {
          saveSessionToLocalQueue(payload);
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [
    userId,
    sessionId,
    selectedCourse,
    timeline,
    startTime,
    originalStartTime,
    accessToken,
  ]);
}
