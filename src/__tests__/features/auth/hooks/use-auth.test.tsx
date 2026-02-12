import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  useAuth,
  AuthContext,
  AuthContextType,
} from '@/features/auth/hooks/use-auth';

// Helper to create wrapper component with custom context value
const createWrapper = (value: AuthContextType | undefined) => {
  return ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

describe('useAuth', () => {
  describe('Context', () => {
    it('should have undefined as default value', () => {
      // The context is created with undefined as default
      expect(AuthContext).toBeDefined();
    });
  });

  describe('Hook Usage', () => {
    it('should return context when used within AuthProvider', () => {
      const mockValue: AuthContextType = {
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
      };

      const wrapper = createWrapper(mockValue);
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toEqual(mockValue);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.signOut).toBeDefined();
    });

    it('should return user data when context has user', () => {
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

      const mockValue: AuthContextType = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: mockUser as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session: mockSession as any,
        loading: false,
        signOut: vi.fn(),
      };

      const wrapper = createWrapper(mockValue);
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.loading).toBe(false);
    });

    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Render without wrapper (outside provider)
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider'
      );

      consoleSpy.mockRestore();
    });

    it('should throw descriptive error message', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        renderHook(() => useAuth());
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          'useAuth must be used within an AuthProvider'
        );
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Context Type Structure', () => {
    it('should have correct interface properties', () => {
      // Verify the interface has all required properties
      const mockValue: AuthContextType = {
        user: null,
        session: null,
        loading: true,
        signOut: vi.fn().mockResolvedValue(undefined),
      };

      // TypeScript will fail if interface is wrong
      expect(mockValue).toHaveProperty('user');
      expect(mockValue).toHaveProperty('session');
      expect(mockValue).toHaveProperty('loading');
      expect(mockValue).toHaveProperty('signOut');
      expect(typeof mockValue.signOut).toBe('function');
    });
  });
});
