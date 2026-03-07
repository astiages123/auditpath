import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';

const QuotaSchema = z.object({
  daily_limit: z.number().optional().default(250),
  remaining: z.number().optional().default(250),
});

export type QuotaData = z.infer<typeof QuotaSchema>;

export const quotaKeys = {
  all: ['quota'] as const,
  user: (userId: string) => [...quotaKeys.all, userId] as const,
};

/**
 * Kullanıcı kota bilgilerini çeken React Query hook'u.
 */
export function useQuota(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: quotaKeys.user(userId || 'guest'),
    queryFn: async () => {
      if (!userId) return { daily_limit: 0, remaining: 0 };

      const { data, success } = await safeQuery(
        supabase.rpc('get_user_quota_info'),
        'Error fetching quota info'
      );

      if (!success) throw new Error('Could not fetch quota');

      const parsed = QuotaSchema.safeParse(data);
      if (!parsed.success) throw new Error('Invalid quota data');

      return parsed.data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 dakika
  });

  /**
   * İstemci tarafında kalan kotayı iyimser olarak günceller.
   */
  const decrementClientQuota = () => {
    if (!userId) return;

    queryClient.setQueryData<QuotaData>(quotaKeys.user(userId), (old) => {
      if (!old) return old;
      return {
        ...old,
        remaining: Math.max(0, old.remaining - 1),
      };
    });
  };

  return {
    ...query,
    quota: {
      dailyLimit: query.data?.daily_limit ?? 0,
      remaining: query.data?.remaining ?? 0,
      isLoading: query.isLoading,
      error: query.error ? (query.error as Error).message : null,
    },
    decrementClientQuota,
    fetchQuota: query.refetch,
  };
}
