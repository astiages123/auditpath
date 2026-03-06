import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';

/**
 * Retrieves the total number of unique active days for a user based on their Pomodoro sessions.
 *
 * @param userId - The UUID of the user
 * @returns A promise resolving to the number of unique active days
 */
export async function getTotalActiveDays(userId: string): Promise<number> {
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
    data.map((session) => {
      const date = new Date(session.started_at);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(date.getDate()).padStart(2, '0')}`;
    })
  );

  return days.size;
}
