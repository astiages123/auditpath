import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { env } from '@/config';

// Singleton instance
let _supabase: SupabaseClient<Database> | null = null;

export const getSupabase = (): SupabaseClient<Database> => {
  if (!_supabase) {
    if (!env.supabase.url || !env.supabase.anonKey) {
      // Provide a graceful fallback or throw if critical
      // For build-time non-env situations, placeholder prevents crashes
      const url = env.supabase.url || 'https://placeholder.supabase.co';
      const key = env.supabase.anonKey || 'placeholder';
      _supabase = createClient<Database>(url, key);
    } else {
      _supabase = createClient<Database>(
        env.supabase.url,
        env.supabase.anonKey
      );
    }
  }
  return _supabase;
};

// Export the singleton instance directly as well
export const supabase = getSupabase();
