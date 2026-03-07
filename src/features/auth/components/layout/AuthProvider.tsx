import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  User,
  Session,
  AuthError,
  AuthChangeEvent,
} from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase';
import { AuthContext } from '@/features/auth/hooks/useAuth';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

/**
 * Provides authentication state and methods to the application.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    user: User | null;
    session: Session | null;
    loading: boolean;
    error: AuthError | null;
  }>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  const supabase = getSupabase();

  /**
   * Clears the current authentication error.
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Signs out the current user.
   */
  const signOut = useCallback(async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      setState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      const authError = error as AuthError;
      console.error('[AuthProvider][signOut] Hata:', authError);
      logger.error('Auth', 'signOut', 'Sign out error', authError);

      setState((prev) => ({ ...prev, error: authError }));
      toast.error('Oturum kapatılamadı.', {
        description: authError.message,
      });
    }
  }, [supabase.auth]);

  useEffect(() => {
    let mounted = true;

    /**
     * Initializes the authentication session.
     */
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (mounted) {
          setState((prev) => ({
            ...prev,
            session: initialSession,
            user: initialSession?.user ?? null,
            loading: false,
          }));
        }
      } catch (error: unknown) {
        if (!mounted) return;

        const authError = error as AuthError;

        // AbortError is expected during unmount, no need to log as error
        if (authError.message?.includes('signal is aborted')) {
          console.warn(
            '[AuthProvider][initializeAuth] Initialization aborted (likely unmount)'
          );
          return;
        }

        console.error('[AuthProvider][initializeAuth] Hata:', authError);
        logger.error(
          'Auth',
          'initializeAuth',
          'Auth initialization error',
          authError
        );

        setState((prev) => ({
          ...prev,
          error: authError,
          loading: false,
        }));
        toast.error('Oturum başlatılamadı.', {
          description: authError.message,
        });
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (
        _event: AuthChangeEvent,
        currentSession: Session | null
      ): Promise<void> => {
        if (mounted) {
          setState((prev) => ({
            ...prev,
            session: currentSession,
            user: currentSession?.user ?? null,
            loading: false,
          }));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const value = useMemo(
    () => ({
      user: state.user,
      session: state.session,
      loading: state.loading,
      error: state.error,
      signOut,
      clearError,
    }),
    [state.user, state.session, state.loading, state.error, signOut, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
