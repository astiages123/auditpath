import { PostgrestError } from '@supabase/supabase-js';

import { ApiResponse } from '@/types/common';
import { logger } from '@/utils/logger';

// ===========================
// === TİP TANIMLAMALARI ===
// ===========================

/**
 * Güvenli sorgu sonuçları için standart dönüş tipi.
 * ApiResponse yapısını sayma (count) bilgisi ile genişletir.
 */
export interface SafeQueryResult<T> extends ApiResponse<T> {
  /** Sorgu sonucundaki toplam kayıt sayısı (eğer istenmişse) */
  count: number | null;
}

// ===========================
// === HATA YÖNETİMİ ===
// ===========================

/**
 * Supabase işlemlerinde meydana gelen hataları standart bir formatta işler ve loglar.
 *
 * @param error - Meydana gelen hata nesnesi
 * @param context - Hatanın oluştuğu bağlam (modül/fonksiyon adı)
 * @param onRetry - Hata durumunda isteğe bağlı çalıştırılacak geri çağırma fonksiyonu
 */
export async function handleSupabaseError(
  error: unknown,
  context: string,
  onRetry?: () => void
): Promise<void> {
  if (!error) return;

  const isPostgrestError = (e: unknown): e is PostgrestError =>
    typeof e === 'object' && e !== null && 'code' in e && 'message' in e;

  const details = isPostgrestError(error)
    ? { code: error.code, message: error.message, hint: error.hint }
    : error;

  // Standart hata log formatı
  console.error(`[SupabaseHelpers][${context}] Hata:`, details);

  logger.error(
    'SupabaseHelpers',
    context,
    'İşlem başarısız oldu',
    details instanceof Error ? details : { details }
  );

  if (onRetry) {
    onRetry();
  }
}

// ===========================
// === GÜVENLİ SORGU İŞLEMLERİ ===
// ===========================

/**
 * Bir Supabase sorgu sözünü (promise) güvenli bir şekilde yürütür.
 * Hataları otomatik yakalar, loglar ve standart SafeQueryResult tipinde döner.
 *
 * @param queryPromise - Yürütülecek olan Supabase sorgusu
 * @param errorMessage - Hata durumunda kullanıcıya gösterilecek/loglanacak mesaj
 * @param context - Sorgunun çalıştırıldığı bağlam bilgileri
 * @returns Sorgu sonucu (başarı durumu, veri ve hata bilgisiyle birlikte)
 */
export async function safeQuery<T>(
  queryPromise: PromiseLike<{
    data: T | null;
    error: unknown;
    count?: number | null;
  }>,
  errorMessage: string,
  context?: Record<string, unknown>
): Promise<SafeQueryResult<T>> {
  try {
    const { data, error, count } = await queryPromise;

    if (error) {
      const message = (error as { message?: string })?.message || errorMessage;

      console.error('[SupabaseHelpers][safeQuery] Hata:', {
        message,
        error,
        ...context,
      });
      logger.error('SupabaseHelpers', 'safeQuery', message, {
        ...context,
        error,
      });

      return {
        success: false,
        data: undefined,
        error: message,
        count: count ?? null,
      };
    }

    return {
      success: true,
      data: data ?? undefined,
      error: undefined,
      count: count ?? null,
    };
  } catch (err) {
    const errorString = err instanceof Error ? err.message : 'Bilinmeyen hata';

    console.error('[SupabaseHelpers][safeQuery] Beklenmedik Hata:', {
      errorMessage,
      err,
    });
    logger.error(
      'SupabaseHelpers',
      'safeQuery',
      `Beklenmedik hata: ${errorMessage}`,
      {
        ...context,
        error: err,
      }
    );

    return {
      success: false,
      data: undefined,
      error: errorString,
      count: null,
    };
  }
}
