import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';

// ===========================
// === ACTIVE DAYS ===
// ===========================

/**
 * Retrieves the total number of unique active days for a user based on their Pomodoro sessions.
 *
 * @param userId - The UUID of the user
 * @returns A promise resolving to the number of unique active days
 */
export async function getTotalActiveDays(userId: string): Promise<number> {
  try {
    const { data } = await safeQuery<{ started_at: string }[]>(
      supabase
        .from('pomodoro_sessions')
        .select('started_at')
        .eq('user_id', userId),
      'getTotalActiveDays query error',
      { userId }
    );

    if (!data || data.length === 0) return 0;

    const days = new Set(
      data.map((d) => {
        const date = new Date(d.started_at);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(date.getDate()).padStart(2, '0')}`;
      })
    );

    return days.size;
  } catch (error) {
    console.error('[activeDaysService][getTotalActiveDays] Error:', error);
    return 0;
  }
}
