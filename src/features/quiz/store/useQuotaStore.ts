import { create } from 'zustand';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

/**
 * Kullanıcı kota bilgilerini temsil eden arayüz.
 */
interface QuotaInfo {
  /** Günlük toplam soru limiti */
  dailyLimit: number;
  /** Kalan soru hakkı */
  remaining: number;
  /** Veri yükleniyor mu? */
  isLoading: boolean;
  /** Varsa hata mesajı */
  error: string | null;
}

/**
 * Kullanıcı kotasını (limitlerini) yöneten Zustand store arayüzü.
 */
interface QuotaStore {
  /** Kota durumu nesnesi */
  quota: QuotaInfo;
  /** Sunucudan güncel kota bilgilerini çeker */
  fetchQuota: () => Promise<void>;
  /** İstemci tarafında kalan kotayı 1 azaltır (iyimser güncelleme) */
  decrementClientQuota: () => void;
}

const QuotaSchema = z.object({
  daily_limit: z.number().optional().default(250),
  remaining: z.number().optional().default(250),
});

/**
 * Kullanıcının günlük soru limitlerini ve kalan haklarını takip eden store.
 * Supabase RPC ("get_user_quota_info") kullanarak veri çeker.
 */
export const useQuotaStore = create<QuotaStore>()((set) => ({
  quota: {
    dailyLimit: 0,
    remaining: 0,
    isLoading: false,
    error: null,
  },

  fetchQuota: async () => {
    set((state) => ({
      quota: { ...state.quota, isLoading: true, error: null },
    }));

    try {
      const { data, error } = await supabase.rpc('get_user_quota_info');

      if (error) throw error;

      const parsedQuota = QuotaSchema.safeParse(data);
      if (parsedQuota.success) {
        set({
          quota: {
            dailyLimit: parsedQuota.data.daily_limit,
            remaining: parsedQuota.data.remaining,
            isLoading: false,
            error: null,
          },
        });
      } else {
        console.warn(
          '[useQuotaStore][fetchQuota] Veri doğrulama hatası:',
          parsedQuota.error
        );
        throw new Error('Geçersiz kota verisi');
      }
    } catch (err) {
      console.error('[useQuotaStore][fetchQuota] Hata:', err);
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
