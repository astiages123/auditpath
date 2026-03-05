// ==========================================
// IMPORTS
// ==========================================

import { supabase } from '@/lib/supabase';
import type { GenerationCostLog } from '../types/costTypes';
import { validateLogs } from '../logic/costsLogic';

// ==========================================
// SERVICE
// ==========================================

export const CostsService = {
  async fetchAvailableProviders(startDate?: Date): Promise<string[]> {
    const pageSize = 250;
    const providers = new Set<string>();
    let page = 1;

    try {
      while (true) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('ai_generation_costs')
          .select('provider')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const rows = data || [];
        rows.forEach((row) => {
          if (typeof row.provider === 'string' && row.provider.length > 0) {
            providers.add(row.provider);
          }
        });

        if (rows.length < pageSize) {
          break;
        }

        page += 1;
      }

      return Array.from(providers).sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error('[costsService][fetchAvailableProviders] Hata:', error);
      throw error;
    }
  },

  async fetchGenerationCostSummary(
    options: {
      startDate?: Date;
      model?: string;
    } = {}
  ): Promise<GenerationCostLog[]> {
    const pageSize = 250;
    const allLogs: GenerationCostLog[] = [];
    let page = 1;

    try {
      while (true) {
        const batch = await this.fetchGenerationCosts({
          ...options,
          page,
          pageSize,
        });

        allLogs.push(...batch);

        if (batch.length < pageSize) {
          break;
        }

        page += 1;
      }

      return allLogs;
    } catch (error) {
      console.error('[costsService][fetchGenerationCostSummary] Hata:', error);
      throw error;
    }
  },

  /**
   * Fetches AI generation cost logs from Supabase.
   *
   * @param {Object} options - Fetch options including limit and startDate.
   * @param {number} [options.limit=10000] - Maximum number of records to fetch.
   * @param {Date} [options.startDate] - Fetch records created after this date.
   * @returns {Promise<GenerationCostLog[]>} Array of generation cost logs.
   */
  async fetchGenerationCosts(
    options: {
      page?: number;
      pageSize?: number;
      startDate?: Date;
      model?: string;
    } = {}
  ): Promise<GenerationCostLog[]> {
    const { page = 1, pageSize = 50, startDate, model } = options;
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

      if (model && model !== 'all') {
        // Provider alanini maliyet ekranindaki model filtresi icin kullaniyoruz
        query = query.eq('provider', model);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return validateLogs(data || []);
    } catch (error) {
      console.error('[costsService][fetchGenerationCosts] Hata:', error);
      throw error;
    }
  },
};
