import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { env } from '@/utils/env';

export type { Database };
export type { SupabaseClient };

// Singleton instance
let _supabase: SupabaseClient<Database> | null = null;

export const getSupabase = (): SupabaseClient<Database> => {
  if (!_supabase) {
    if (!env.supabase.url || !env.supabase.anonKey) {
      throw new Error(
        'Supabase URL and Anon Key are required. Please check your environment variables.'
      );
    }
    _supabase = createClient<Database>(env.supabase.url, env.supabase.anonKey);
  }
  return _supabase;
};

// Export the singleton instance directly as well
export const supabase = getSupabase();
