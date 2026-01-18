import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Singleton instance
let _supabase: SupabaseClient<Database> | null = null;

export const getSupabase = (): SupabaseClient<Database> => {
    if (!_supabase) {
        if (!supabaseUrl || !supabaseAnonKey) {
            // Provide a graceful fallback or throw if critical
            // For build-time non-env situations, placeholder prevents crashes
            const url = supabaseUrl || 'https://placeholder.supabase.co';
            const key = supabaseAnonKey || 'placeholder';
            _supabase = createClient<Database>(url, key);
        } else {
            _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
        }
    }
    return _supabase;
};

// Export the singleton instance directly as well
export const supabase = getSupabase();


