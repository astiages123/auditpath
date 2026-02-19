import { supabase } from '@/lib/supabase';

/**
 * Get total number of active days for a user.
 *
 * @param userId User ID
 * @returns Number of unique active days
 */
export async function getTotalActiveDays(userId: string) {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('started_at')
    .eq('user_id', userId);

  if (error || !data) return 0;

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
}
