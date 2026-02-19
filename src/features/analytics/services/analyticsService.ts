import { supabase } from '@/lib/supabase';
import { AiGenerationCost } from '../types/analyticsTypes';

export const AnalyticsService = {
  /**
   * Fetches AI generation cost logs from Supabase.
   * @param limit Maximum number of logs to fetch.
   * @returns Array of AiGenerationCost logs.
   */
  async fetchGenerationCosts(limit = 10000): Promise<AiGenerationCost[]> {
    const { data, error } = await supabase
      .from('ai_generation_costs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as AiGenerationCost[];
  },
};
