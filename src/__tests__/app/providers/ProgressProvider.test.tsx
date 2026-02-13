import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { ProgressProvider } from '@/app/providers/ProgressProvider';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  useProgressQuery,
  useOptimisticProgress,
  useProgress,
  ProgressStats,
  defaultStats,
} from '@/shared/hooks/use-progress';
import type { UseQueryResult } from '@tanstack/react-query';

// Mock dependencies
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/shared/hooks/use-progress', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/hooks/use-progress')>();
  return {
    ...actual,
    useProgressQuery: vi.fn(),
    useOptimisticProgress: vi.fn(),
  };
});

// Helper to create minimal mock query result with required fields
const createMockQueryResult = (
  data: Partial<ProgressStats> | null,
  isLoading: boolean
): UseQueryResult<ProgressStats, Error> => {
  const mockData: ProgressStats = data
    ? { ...defaultStats, ...data }
    : defaultStats;

  if (isLoading) {
    return {
      data: undefined,
      dataUpdatedAt: 0,
      error: null,
      errorUpdatedAt: 0,
      errorUpdateCount: 0,
      isError: false,
      isLoading: true,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: false,
      isPending: true,
      isPlaceholderData: false,
      isFetching: true,
      isRefetching: false,
      isStale: true,
      isInitialLoading: true,
      isFetched: false,
      isFetchedAfterMount: false,
      isPaused: false,
      isEnabled: true,
      status: 'pending',
      fetchStatus: 'fetching',
      failureCount: 0,
      failureReason: null,
      refetch: vi.fn(),
      promise: Promise.resolve(mockData),
    };
  }

  return {
    data: mockData,
    dataUpdatedAt: Date.now(),
    error: null,
    errorUpdatedAt: 0,
    errorUpdateCount: 0,
    isError: false,
    isLoading: false,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: true,
    isPending: false,
    isPlaceholderData: false,
    isFetching: false,
    isRefetching: false,
    isStale: false,
    isInitialLoading: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isPaused: false,
    isEnabled: true,
    status: 'success',
    fetchStatus: 'idle',
    failureCount: 0,
    failureReason: null,
    refetch: vi.fn(),
    promise: Promise.resolve(mockData),
  };
};

// A consumer component to test context access
const ProgressConsumer = () => {
  const { stats, updateProgressOptimistically } = useProgress();
  return (
    <div>
      <div data-testid="videos">{stats.completedVideos}</div>
      <button
        data-testid="update-btn"
        onClick={() => updateProgressOptimistically('course-1', 1, 0.5)}
      >
        Update
      </button>
    </div>
  );
};

describe('ProgressProvider', () => {
  const mockUpdateProgress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      },
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
    vi.mocked(useProgressQuery).mockReturnValue(
      createMockQueryResult({ completedVideos: 10, streak: 5 }, false)
    );
    vi.mocked(useOptimisticProgress).mockReturnValue({
      updateProgress: mockUpdateProgress,
    });
  });

  it('provides progress stats to consumers', () => {
    render(
      <ProgressProvider>
        <ProgressConsumer />
      </ProgressProvider>
    );

    expect(screen.getByTestId('videos')).toHaveTextContent('10');
  });

  it('calls updateProgress when consumer triggers update', async () => {
    render(
      <ProgressProvider>
        <ProgressConsumer />
      </ProgressProvider>
    );

    const btn = screen.getByTestId('update-btn');
    await act(async () => {
      btn.click();
    });

    expect(mockUpdateProgress).toHaveBeenCalledWith(
      'user-1',
      'course-1',
      1,
      0.5
    );
  });

  it('handles loading state', () => {
    vi.mocked(useProgressQuery).mockReturnValue(
      createMockQueryResult(null, true)
    );

    const LoaderConsumer = () => {
      const { isLoading } = useProgress();
      return (
        <div data-testid="loader">{isLoading ? 'Loading...' : 'Loaded'}</div>
      );
    };

    render(
      <ProgressProvider>
        <LoaderConsumer />
      </ProgressProvider>
    );

    expect(screen.getByTestId('loader')).toHaveTextContent('Loading...');
  });
});
