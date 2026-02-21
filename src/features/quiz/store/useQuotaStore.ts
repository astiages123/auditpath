import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { type Json } from '@/types/database.types';
import { logger } from '@/utils/logger';

interface QuotaStore {
  quota: {
    dailyLimit: number;
    remaining: number;
    isLoading: boolean;
    error: string | null;
  };
  fetchQuota: () => Promise<void>;
  decrementClientQuota: () => void; // For optimistic UI updates
}

export const useQuotaStore = create<QuotaStore>()((set) => ({
  quota: {
    dailyLimit: 50,
    remaining: 50,
    isLoading: false,
    error: null,
  },

  fetchQuota: async () => {
    set((state) => ({
      quota: { ...state.quota, isLoading: true, error: null },
    }));
    try {
      // Call the RPC defined in our migration
      const { data, error } = await supabase.rpc('get_user_quota_info');

      if (error) throw error;

      const quotaData = data as Json;
      if (quotaData && typeof quotaData === 'object') {
        set({
          quota: {
            dailyLimit:
              (quotaData as { daily_limit?: number }).daily_limit ?? 50,
            remaining: (quotaData as { remaining?: number }).remaining ?? 50,
            isLoading: false,
            error: null,
          },
        });
      }
    } catch (err) {
      logger.error('Failed to fetch quota:', { err });
      set((state) => ({
        quota: {
          ...state.quota,
          isLoading: false,
          error: 'Kota bilgisi alınamadı',
        },
      }));
    }
  },

  decrementClientQuota: () =>
    set((state) => ({
      quota: {
        ...state.quota,
        remaining: Math.max(0, state.quota.remaining - 1),
      },
    })),
}));
