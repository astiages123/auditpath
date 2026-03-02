import { useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { AuthContext } from '../hooks/useAuth';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

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

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  useEffect(() => {
    let mounted = true;

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
      } catch (err) {
        const authError = err as AuthError;
        logger.error('Auth initialization error', authError);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            error: authError,
            loading: false,
          }));
          toast.error('Oturum başlatılamadı.', {
            description: authError.message,
          });
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (mounted) {
        setState((prev) => ({
          ...prev,
          session: currentSession,
          user: currentSession?.user ?? null,
          loading: false,
        }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

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
    } catch (err) {
      const authError = err as AuthError;
      logger.error('Sign out error', authError);
      setState((prev) => ({ ...prev, error: authError }));
      toast.error('Oturum kapatılamadı.', {
        description: authError.message,
      });
    }
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
