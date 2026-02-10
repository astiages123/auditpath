'use client';

import React, { useCallback, useMemo } from 'react';
import { useAuth } from '@/features/auth';
import { ProgressContext, ProgressStats } from '@/shared/hooks/use-progress';
import {
  useProgressQuery,
  useOptimisticProgress,
  defaultStats,
} from '@/shared/hooks/use-progress';

interface ProgressProviderProps {
  children: React.ReactNode;
  initialStats?: Partial<ProgressStats>; // Kept for API compatibility, used in query initialData
}

export function ProgressProvider({
  children,
  initialStats,
}: ProgressProviderProps) {
  const { user } = useAuth();
  const userId = user?.id;

  // 1. Fetch Data with TanStack Query
  const {
    data: stats,
    isLoading,
    refetch,
  } = useProgressQuery(userId, initialStats);

  // 2. Optimistic Updates Helper
  const { updateProgress } = useOptimisticProgress();

  // 3. Handlers
  const refreshProgress = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateProgressOptimistically = useCallback(
    (courseId: string, deltaVideos: number, deltaHours: number) => {
      if (userId) {
        updateProgress(userId, courseId, deltaVideos, deltaHours);
      }
    },
    [userId, updateProgress]
  );

  // 4. Memoize Context Value
  const value = useMemo(
    () => ({
      stats: stats || (defaultStats as ProgressStats),
      refreshProgress,
      isLoading,
      streak: stats?.streak || 0,
      updateProgressOptimistically,
    }),
    [stats, refreshProgress, isLoading, updateProgressOptimistically]
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}
