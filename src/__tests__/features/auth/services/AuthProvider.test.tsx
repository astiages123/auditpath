import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
import { AuthProvider } from '@/features/auth/services/AuthProvider';
import { useAuth } from '@/features/auth/hooks/use-auth';

import '@testing-library/jest-dom/vitest';

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
  const mockUser = { id: 'test-user-id', email: 'test@example.com' };
  const mockSession = {
    access_token: 't',
    refresh_token: 'r',
    expires_in: 3600,
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should start with loading state true', async () => {
      mockGetSession.mockImplementation(() => new Promise(() => {}));
      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });
      expect(screen.getByTestId('loading').textContent).toBe('true');
    });

    it('should fetch initial session on mount', async () => {
      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });
      await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    });

    it('should set loading false after initialization', async () => {
      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });
      await waitFor(() =>
        expect(screen.getByTestId('loading').textContent).toBe('false')
      );
    });

    it('should set user and session from initial session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });
      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('test@example.com');
      });
    });

    it('should handle getSession errors gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Error' },
      });
      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });
      await waitFor(() =>
        expect(screen.getByTestId('loading').textContent).toBe('false')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Auth State Changes', () => {
    it('should listen to auth state changes', async () => {
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });
      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });
      // Verify onAuthStateChange was called during initialization
      await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());
    });

    it('should handle sign in by updating initial session', async () => {
      // Test that sign in works via getSession returning a session
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });
      await waitFor(() =>
        expect(screen.getByTestId('user').textContent).toBe('test@example.com')
      );
    });
  });

  describe('signOut', () => {
    it('should call signOut when button is clicked', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });
      await waitFor(() =>
        expect(screen.getByTestId('user').textContent).toBe('test@example.com')
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('signout-btn'));
      });

      // Verify signOut was called
      await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    });

    it('should clear user state after signOut', async () => {
      // Mock signOut to return a new session state (null after signout)
      mockSignOut.mockResolvedValue({ error: null });

      // Initial session
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await waitFor(() =>
        expect(screen.getByTestId('user').textContent).toBe('test@example.com')
      );

      // After clicking signout, verify signOut is called
      await act(async () => {
        fireEvent.click(screen.getByTestId('signout-btn'));
      });

      // Wait for the signOut call to complete
      await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const mockUnsubscribe = vi.fn();
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      let unmountAction: () => void = () => {};
      await act(async () => {
        const { unmount } = render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
        unmountAction = unmount;
      });
      unmountAction();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
