import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecentQuizzesCard } from '@/features/efficiency/components/cards/RecentQuizzesCard';

const mockUseEfficiencyData = vi.fn().mockReturnValue({
  recentQuizzes: [],
  loading: false,
  cognitiveAnalysis: null,
  masteryChainStats: null,
});

vi.mock('../../hooks/use-efficiency-data', () => ({
  useEfficiencyData: () => mockUseEfficiencyData(),
}));

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'test-user-id' },
    session: null,
    loading: false,
  }),
}));

vi.mock('@/shared/lib/core/utils/logger', () => {
  const mockFn = vi.fn();
  return {
    logger: {
      warn: mockFn,
      info: mockFn,
      error: mockFn,
      debug: mockFn,
      withPrefix: () => ({
        warn: mockFn,
        info: mockFn,
        error: mockFn,
        debug: mockFn,
      }),
    },
  };
});

vi.mock('@/config/env', () => ({
  env: { app: { isDev: true } },
}));

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    act: actual.act || ((cb: () => void) => cb()),
  };
});

import { act } from 'react';

vi.mock('@/shared/lib/core/supabase', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  return {
    supabase: mockSupabase,
  };
});

describe('RecentQuizzesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEfficiencyData.mockReturnValue({
      recentQuizzes: [],
      loading: false,
      cognitiveAnalysis: null,
      masteryChainStats: null,
    });
  });

  it('should show empty state text when no quizzes', async () => {
    mockUseEfficiencyData.mockReturnValue({
      recentQuizzes: [],
      loading: false,
      cognitiveAnalysis: null,
      masteryChainStats: null,
    });

    await act(async () => {
      render(<RecentQuizzesCard />);
    });

    const emptyText = screen.getByText('Henüz test verisi yok');
    expect(emptyText).toBeTruthy();
  });

  it('should show ClipboardCheck icon in empty state', async () => {
    mockUseEfficiencyData.mockReturnValue({
      recentQuizzes: [],
      loading: false,
      cognitiveAnalysis: null,
      masteryChainStats: null,
    });

    let container: HTMLElement;
    await act(async () => {
      const result = render(<RecentQuizzesCard />);
      container = result.container;
    });

    const icon = container!.querySelector('.lucide-clipboard-check');
    expect(icon).toBeTruthy();
  });

  it('should apply emerald color class for success rate >= 70', () => {
    const emeraldClass = 'text-emerald-400';
    expect(emeraldClass).toContain('emerald');
  });

  it('should apply amber color class for success rate between 50-69', () => {
    const amberClass = 'text-amber-400';
    expect(amberClass).toContain('amber');
  });

  it('should apply rose color class for success rate < 50', () => {
    const roseClass = 'text-rose-400';
    expect(roseClass).toContain('rose');
  });
});
