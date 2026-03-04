// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AuthProvider } from '../../features/auth/components/layout/AuthProvider';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '../../features/auth/hooks/useAuth';

// Mock lib/supabase
vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Test component to consume useAuth
const TestConsumer = () => {
  const { user, loading, signOut } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="user-email">{user?.email || 'no-user'}</div>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
};

describe('AuthProvider', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(
        (
          _handler?: (event: AuthChangeEvent, session: Session | null) => void
        ) => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })
      ),
      signOut: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getSupabase).mockReturnValue(
      // eslint-disable-next-line no-restricted-syntax
      mockSupabase as unknown as ReturnType<typeof getSupabase>
    );
  });

  it('1. Başlangıçta oturumu doğru şekilde yükler', async () => {
    const mockUser = { email: 'user@test.com' };
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent(
        'user@test.com'
      );
    });
  });

  it('2. Oturum yoksa null user ile başlar', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
    });
  });

  it('3. SignOut fonksiyonu supabase.auth.signOut çağırır ve state temizlenir', async () => {
    const mockUser = { email: 'user@test.com' };
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await screen.findByText('user@test.com');

    const signOutButton = screen.getByText('Sign Out');
    signOutButton.click();

    await waitFor(() => {
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
    });
  });

  it('4. Auth state değiştiğinde (onAuthStateChange) state güncellenir', async () => {
    let authChangeHandler:
      | ((event: AuthChangeEvent, session: Session | null) => void)
      | null
      | undefined = null;
    mockSupabase.auth.onAuthStateChange.mockImplementation((handler) => {
      authChangeHandler = handler;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
    });

    const mockSession = {
      user: { email: 'new@test.com' },
    } as Session;
    if (authChangeHandler) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authChangeHandler as any)('SIGNED_IN', mockSession);
    }

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent(
        'new@test.com'
      );
    });
  });
});
