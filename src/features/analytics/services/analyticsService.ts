// ==========================================
// IMPORTS
// ==========================================

import { supabase } from '@/lib/supabase';
import { AiGenerationCost } from '../types/analyticsTypes';

// ==========================================
// SERVICE
// ==========================================

export const AnalyticsService = {
  /**
   * Fetches AI generation cost logs from Supabase.
   *
   * @param {Object} options - Fetch options including limit and startDate.
   * @param {number} [options.limit=10000] - Maximum number of records to fetch.
   * @param {Date} [options.startDate] - Fetch records created after this date.
   * @returns {Promise<AiGenerationCost[]>} Array of AiGenerationCost logs.
   */
  async fetchGenerationCosts(
    options: {
      page?: number;
      pageSize?: number;
      startDate?: Date;
    } = {}
  ): Promise<AiGenerationCost[]> {
    const { page = 1, pageSize = 50, startDate } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase
        .from('ai_generation_costs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []) as AiGenerationCost[];
    } catch (error) {
      console.error('[analyticsService][fetchGenerationCosts] Hata:', error);
      throw error;
    }
  },

  /**
   * Fetches full dashboard analytics for a user.
   *
   * @param {string} _userId - The user ID to fetch data for.
   * @returns {Promise<{quizStatus: any, dailyProgress: AiGenerationCost[], recentActivity: any[], subjectMastery: any[], scoreTypeAnalytics: any[]} | null>} Dashboard data summary.
   */
  async getDashboardData(_userId: string): Promise<{
    quizStatus: Record<string, unknown>;
    dailyProgress: AiGenerationCost[];
    recentActivity: unknown[];
    subjectMastery: unknown[];
    scoreTypeAnalytics: unknown[];
  } | null> {
    try {
      const costs = await this.fetchGenerationCosts({ pageSize: 1000 });
      return {
        quizStatus: {}, // Placeholder
        dailyProgress: costs,
        recentActivity: [],
        subjectMastery: [],
        scoreTypeAnalytics: [],
      };
    } catch (error) {
      console.error('[analyticsService][getDashboardData] Hata:', error);
      return null;
    }
  },
};
