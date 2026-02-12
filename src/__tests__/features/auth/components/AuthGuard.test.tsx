import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import '@testing-library/jest-dom/vitest';

// Mock useAuth hook
const mockUseAuth = vi.fn();

vi.mock('@/features/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock AuthModal
vi.mock('@/features/auth/components/AuthModal', () => ({
  AuthModal: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="auth-modal" data-open={open}>
      {open && (
        <button onClick={() => onOpenChange(false)} data-testid="close-modal">
          Close
        </button>
      )}
    </div>
  ),
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading text while auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: true,
        signOut: vi.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
      });
    });

    it('should show login prompt when user is not authenticated', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Oturum Açmanız Gerekiyor')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show description text', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(
        screen.getByText(/bu sayfaya erişmek için lütfen giriş yapın/i)
      ).toBeInTheDocument();
    });

    it('should show login button', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(
        screen.getByRole('button', { name: /giriş yap/i })
      ).toBeInTheDocument();
    });

    it('should open modal when login button is clicked', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      const loginButton = screen.getByRole('button', { name: /giriş yap/i });
      fireEvent.click(loginButton);

      expect(screen.getByTestId('auth-modal')).toHaveAttribute(
        'data-open',
        'true'
      );
    });

    it('should close modal when close button is clicked', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Open modal
      const loginButton = screen.getByRole('button', { name: /giriş yap/i });
      fireEvent.click(loginButton);

      // Close modal
      const closeButton = screen.getByTestId('close-modal');
      fireEvent.click(closeButton);

      expect(screen.getByTestId('auth-modal')).toHaveAttribute(
        'data-open',
        'false'
      );
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00Z',
        },
        session: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: null,
        },
        loading: false,
        signOut: vi.fn(),
      });
    });

    it('should render children when user is authenticated', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(
        screen.queryByText('Oturum Açmanız Gerekiyor')
      ).not.toBeInTheDocument();
    });

    it('should not show loading text when authenticated', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.queryByText('Yükleniyor...')).not.toBeInTheDocument();
    });

    it('should not show login button when authenticated', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(
        screen.queryByRole('button', { name: /giriş yap/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('should transition from loading to authenticated', () => {
      const { rerender } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Start with loading
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: true,
        signOut: vi.fn(),
      });
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();

      // Transition to authenticated
      mockUseAuth.mockReturnValue({
        user: {
          id: 'test-user-id',
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
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should transition from loading to unauthenticated', () => {
      const { rerender } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Start with loading
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: true,
        signOut: vi.fn(),
      });
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();

      // Transition to unauthenticated
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
      });
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      expect(screen.getByText('Oturum Açmanız Gerekiyor')).toBeInTheDocument();
    });
  });
});
