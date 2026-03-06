import { supabase } from '@/lib/supabase';
import type { GenerationCostLog } from '../types/costTypes';
import { validateLogs } from '../logic/costsLogic';

export const CostsService = {
  async fetchAvailableModels(startDate?: Date): Promise<string[]> {
    const pageSize = 500;
    const items = new Set<string>();
    let page = 1;

    while (true) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Hem provider hem model alanlarini cekip benzersizleri listeliyoruz
      // Cunku farkli donemlerde farkli alanlar kullanilmis olabilir
      let query = supabase
        .from('ai_generation_costs')
        .select('provider, model')
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
          items.add(row.provider);
        }
        if (typeof row.model === 'string' && row.model.length > 0) {
          items.add(row.model);
        }
      });

      if (rows.length < pageSize) {
        break;
      }

      page += 1;
    }

    return Array.from(items).sort((left, right) => left.localeCompare(right));
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

    let query = supabase
      .from('ai_generation_costs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (model && model !== 'all') {
      if (model === 'none') {
        query = query.or(
          'provider.is.null,provider.eq."",model.is.null,model.eq.""'
        );
      } else {
        // Hem provider hem model kolonunda arama yapiyoruz
        query = query.or(`provider.eq."${model}",model.eq."${model}"`);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return validateLogs(data || []);
  },
};
