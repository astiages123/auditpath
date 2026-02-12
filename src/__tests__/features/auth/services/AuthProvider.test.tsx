import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider } from '@/features/auth/services/AuthProvider';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { Session } from '@supabase/supabase-js';
import '@testing-library/jest-dom/vitest';

// Type for auth state change callback
type AuthStateCallback = (event: string, session: Session | null) => void;

// Mock Supabase
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/shared/lib/core/supabase', () => ({
  getSupabase: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
  }),
}));

// Test component to access auth context
const TestComponent = () => {
  const { user, session, loading, signOut } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{user ? user.email : 'null'}</div>
      <div data-testid="session">{session ? 'exists' : 'null'}</div>
      <button onClick={signOut} data-testid="signout-btn">
        Sign Out
      </button>
    </div>
  );
};

describe('AuthProvider', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockSession = {
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should start with loading state true', () => {
      // Don't resolve getSession yet
      mockGetSession.mockImplementation(() => new Promise(() => {}));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading').textContent).toBe('true');
    });

    it('should fetch initial session on mount', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalledTimes(1);
      });
    });

    it('should set loading false after initialization', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
    });

    it('should set user and session from initial session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('test@example.com');
        expect(screen.getByTestId('session').textContent).toBe('exists');
      });
    });

    it('should handle getSession errors gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Auth initialization error:',
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Auth State Changes', () => {
    it('should update user on auth state change', async () => {
      let capturedCallback: AuthStateCallback | undefined;

      mockOnAuthStateChange.mockImplementation(
        (callback: AuthStateCallback) => {
          capturedCallback = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }
      );

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      // Simulate auth state change (user signs in)
      if (capturedCallback) {
        capturedCallback('SIGNED_IN', mockSession as Session);
      }

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('test@example.com');
        expect(screen.getByTestId('session').textContent).toBe('exists');
      });
    });

    it('should clear user on sign out event', async () => {
      let capturedCallback: AuthStateCallback | undefined;

      mockOnAuthStateChange.mockImplementation(
        (callback: AuthStateCallback) => {
          capturedCallback = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }
      );

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial session
      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('test@example.com');
      });

      // Simulate sign out event
      if (capturedCallback) {
        capturedCallback('SIGNED_OUT', null);
      }

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null');
        expect(screen.getByTestId('session').textContent).toBe('null');
      });
    });
  });

  describe('signOut', () => {
    it('should call supabase.auth.signOut', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('test@example.com');
      });

      fireEvent.click(screen.getByTestId('signout-btn'));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear user and session after signOut', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSignOut.mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('test@example.com');
      });

      fireEvent.click(screen.getByTestId('signout-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null');
        expect(screen.getByTestId('session').textContent).toBe('null');
      });
    });

    it('should handle signOut errors gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSignOut.mockRejectedValue(new Error('Sign out failed'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('test@example.com');
      });

      fireEvent.click(screen.getByTestId('signout-btn'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Sign out error:',
          expect.anything()
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const mockUnsubscribe = vi.fn();

      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Children Rendering', () => {
    it('should render children', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(
        <AuthProvider>
          <div data-testid="child">Child Content</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByTestId('child').textContent).toBe('Child Content');
    });
  });
});
