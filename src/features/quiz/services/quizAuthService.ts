import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

const MODULE = 'QuizAuthService';

export async function getCurrentSessionToken(): Promise<string | null> {
  const FUNC = 'getCurrentSessionToken';
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    logger.error(MODULE, FUNC, 'Auth session error', error);
    throw error;
  }

  return data.session?.access_token || null;
}

export async function getCurrentUserId(): Promise<string | null> {
  const FUNC = 'getCurrentUserId';
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    logger.error(MODULE, FUNC, 'Auth user error', error);
    throw error;
  }

  return user?.id || null;
}
