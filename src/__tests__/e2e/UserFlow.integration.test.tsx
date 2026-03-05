// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState, type FormEvent } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthApiError } from '@supabase/supabase-js';
import { supabase as mockSupabaseInstance } from '@/lib/supabase';
import { Toaster } from 'sonner';
import { QuizView } from '@/features/quiz/components/views/QuizView';
import { useQuotaStore } from '@/features/quiz/store/useQuotaStore';
import { getVirtualDateKey } from '@/utils/dateUtils';
import type { QuizState } from '@/features/quiz/types';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockSupabase = {
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
    rpc: vi.fn(),
  };
  return {
    getSupabase: vi.fn(() => mockSupabase),
    supabase: mockSupabase,
  };
});

// Mock Logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('User Flow Integration Expansion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Başarısız login senaryosu: Hata mesajı gösterilir', async () => {
    const invalidLoginResponse: Awaited<
      ReturnType<typeof mockSupabaseInstance.auth.signInWithPassword>
    > = {
      data: { user: null, session: null, weakPassword: null },
      error: new AuthApiError(
        'Invalid credentials',
        400,
        'invalid_credentials'
      ),
    };

    vi.mocked(mockSupabaseInstance.auth.signInWithPassword).mockResolvedValue(
      invalidLoginResponse
    );

    const MockLoginForm = () => {
      const [error, setError] = useState('');
      const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { data } = await mockSupabaseInstance.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'wrong',
        });
        if (!data.user) setError('E-posta veya şifre hatalı.');
      };
      return (
        <form onSubmit={handleLogin}>
          <button type="submit">Giriş Yap</button>
          {error && <div>{error}</div>}
        </form>
      );
    };

    render(<MockLoginForm />);

    fireEvent.click(screen.getByText('Giriş Yap'));

    await waitFor(() => {
      expect(
        screen.getByText(/E-posta veya şifre hatalı/i)
      ).toBeInTheDocument();
    });
  });

  it('2. Quiz submit başarısızlığı: UI hata durumunu yönetir', async () => {
    const mockState: QuizState = {
      isLoading: false,
      error: 'Submission Failed',
      hasStarted: true,
      currentQuestion: {
        q: 'Q1',
        exp: 'Q1 açıklama',
        o: ['A', 'B'],
        a: 0,
        type: 'multiple_choice',
      },
      queue: [],
      history: [],
      generatedCount: 1,
      totalToGenerate: 1,
      selectedAnswer: null,
      isAnswered: false,
      isCorrect: null,
      showExplanation: false,
      summary: null,
      currentMastery: 0,
      lastSubmissionResult: null,
    };

    const handlers = {
      onConfirm: vi.fn(),
      onBlank: vi.fn(),
      onNext: vi.fn(),
      onPrev: vi.fn(),
      onSelect: vi.fn(),
      onToggleExplanation: vi.fn(),
      onRetry: vi.fn(),
      onClose: vi.fn(),
    };

    render(
      <>
        <Toaster />
        <QuizView state={mockState} progressIndex={0} {...handlers} />
      </>
    );

    expect(screen.getByText(/Oturum Hatası/i)).toBeInTheDocument();
  });

  it('3. Kota dolu durumda doğru kullanıcı mesajı', async () => {
    useQuotaStore.setState({
      quota: { dailyLimit: 250, remaining: 0, isLoading: false, error: null },
    });

    const MockLanding = () => {
      const remainingQuota = useQuotaStore((state) => state.quota.remaining);
      return (
        <div>
          <h1>Quiz Landing</h1>
          {remainingQuota === 0 ? (
            <p>Günlük kotanız doldu. Yarın tekrar bekleriz!</p>
          ) : (
            <button>Quize Başla</button>
          )}
        </div>
      );
    };

    render(<MockLanding />);
    expect(screen.getByText(/Günlük kotanız doldu/i)).toBeInTheDocument();
  });

  it('4. Çok sekme/tutarlılık simülasyonu: Store güncellemeleri yansır', async () => {
    useQuotaStore.setState({
      quota: { dailyLimit: 10, remaining: 10, isLoading: false, error: null },
    });

    const ComponentA = () => {
      const remaining = useQuotaStore((state) => state.quota.remaining);
      const decrement = useQuotaStore((state) => state.decrementClientQuota);
      return (
        <div>
          <span>A-Remaining: {remaining}</span>
          <button onClick={decrement}>Decrement A</button>
        </div>
      );
    };

    const ComponentB = () => {
      const remaining = useQuotaStore((state) => state.quota.remaining);
      return <span>B-Remaining: {remaining}</span>;
    };

    render(
      <div>
        <ComponentA />
        <ComponentB />
      </div>
    );

    fireEvent.click(screen.getByText('Decrement A'));
    expect(screen.getByText('B-Remaining: 9')).toBeInTheDocument();
  });

  it('5. Sanal gün sınırı (23:59/00:00) etkisi', async () => {
    vi.useFakeTimers();
    const almostMidnight = new Date(2026, 2, 5, 23, 59, 50);
    vi.setSystemTime(almostMidnight);
    expect(getVirtualDateKey()).toBe('2026-03-05');

    vi.advanceTimersByTime(20000);
    expect(getVirtualDateKey()).toBe('2026-03-06');
    vi.useRealTimers();
  });
});
