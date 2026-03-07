import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { env } from '@/utils/env';

export type { Database };
export type { SupabaseClient };

/**
 * Supabase client singleton örneği.
 * Sadece getSupabase() fonksiyonu üzerinden erişilmelidir.
 * @private
 */
let _supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Supabase client örneğini oluşturur ve döner.
 * Eğer gerekli çevre değişkenleri eksikse hata fırlatır.
 *
 * @returns Yapılandırılmış SupabaseClient örneği
 * @throws Çevre değişkenleri eksikse Error fırlatır
 */
export const initializeSupabase = (): SupabaseClient<Database> => {
  if (!_supabaseInstance) {
    const { url, anonKey } = env.supabase;

    if (!url || !anonKey) {
      const errorMsg =
        '[Supabase] Bağlantı bilgileri (URL/AnonKey) eksik! Lütfen .env dosyasını kontrol edin.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    _supabaseInstance = createClient<Database>(url, anonKey);
  }

  return _supabaseInstance;
};

/**
 * Uygulama genelinde kullanılacak olan Supabase istemci örneği.
 * Not: Bu sabit initializeSupabase() çağrısıyla başlatılır.
 */
export const supabase: SupabaseClient<Database> = initializeSupabase();

/**
 * Singleton Supabase client erişimi sağlar.
 *
 * @returns Uygulama genelinde kullanılan Supabase istemcisi
 */
export const getSupabase = (): SupabaseClient<Database> => supabase;
