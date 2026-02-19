import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QuotaStore {
  quota: {
    dailyLimit: number;
    remaining: number;
  };
  setQuota: (remaining: number, limit?: number) => void;
  decrementQuota: () => void;
}

export const useQuotaStore = create<QuotaStore>()(
  persist(
    (set) => ({
      quota: {
        dailyLimit: 50,
        remaining: 50,
      },
      setQuota: (remaining, limit) =>
        set((state) => ({
          quota: {
            ...state.quota,
            remaining,
            dailyLimit: limit ?? state.quota.dailyLimit,
          },
        })),
      decrementQuota: () =>
        set((state) => ({
          quota: {
            ...state.quota,
            remaining: Math.max(0, state.quota.remaining - 1),
          },
        })),
    }),
    {
      name: 'quota-store',
      partialize: (state) => ({ quota: state.quota }),
    }
  )
);
