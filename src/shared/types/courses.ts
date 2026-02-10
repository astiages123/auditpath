import { Database } from './supabase';

export type Course = Database['public']['Tables']['courses']['Row'];

export type Category = Database['public']['Tables']['categories']['Row'] & {
  courses: Course[];
};
