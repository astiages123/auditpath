import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

const MODULE = 'QuizAuthService';

export async function getCurrentSessionToken(): Promise<string | null> {
  const FUNC = 'getCurrentSessionToken';
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error(`[${MODULE}][${FUNC}] Auth session error:`, error);
      logger.error(MODULE, FUNC, 'Auth session error', error);
      return null;
    }
    return data.session?.access_token || null;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const FUNC = 'getCurrentUserId';
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error(`[${MODULE}][${FUNC}] Auth user error:`, error);
      logger.error(MODULE, FUNC, 'Auth user error', error);
      return null;
    }
    return user?.id || null;
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return null;
  }
}
