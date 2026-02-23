import { supabase } from '@/lib/supabase';
import { AiGenerationCost } from '../types/analyticsTypes';

export const AnalyticsService = {
  /**
   * Fetches AI generation cost logs from Supabase.
   * @param options Fetch options including limit and startDate.
   * @returns Array of AiGenerationCost logs.
   */
  async fetchGenerationCosts(
    options: { limit?: number; startDate?: Date } = { limit: 10000 }
  ): Promise<AiGenerationCost[]> {
    let query = supabase
      .from('ai_generation_costs')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as AiGenerationCost[];
  },
};
