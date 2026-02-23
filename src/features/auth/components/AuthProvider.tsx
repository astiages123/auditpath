import { useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { AuthContext } from '../hooks/useAuth';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const supabase = getSupabase();

  const clearError = useCallback(() => {
    setError(null);
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
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
      } catch (err) {
        const authError = err as AuthError;
        logger.error('Auth initialization error', authError);
        if (mounted) {
          setError(authError);
          toast.error('Oturum başlatılamadı.', {
            description: authError.message,
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
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
      setUser(null);
      setSession(null);
      setError(null);
    } catch (err) {
      const authError = err as AuthError;
      logger.error('Sign out error', authError);
      setError(authError);
      toast.error('Oturum kapatılamadı.', {
        description: authError.message,
      });
    }
  }, [supabase.auth]);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      error,
      signOut,
      clearError,
    }),
    [user, session, loading, error, signOut, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
