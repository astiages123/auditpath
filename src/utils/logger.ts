import { env } from '@/utils/env';

// ===========================
// === MERKEZİ LOG SİSTEMİ ===
// ===========================

/**
 * Uygulama genelinde kullanılacak merkezi loglama aracı.
 * Geliştirme ortamında detaylı bilgi verirken, üretim ortamında (production) loglamayı kısıtlar.
 */
export const logger = {
  /**
   * Bilgi mesajlarını loglar.
   * @param module - Logun ait olduğu modül/dosya adı
   * @param func - Logun çağrıldığı fonksiyon adı
   * @param message - Log mesajı
   * @param data - İsteğe bağlı ek veri kabukları
   * @example logger.info('QuizService', 'fetchQuestions', 'Sorular başarıyla getirildi', { count: 10 })
   */
  info(module: string, func: string, message: string, data?: unknown): void {
    if (!env.app.isDev) return;
    console.info(`${this._getPrefix(module, func)} ${message}`, data ?? '');
  },

  /**
   * Uyarı mesajlarını loglar.
   * @param module - Logun ait olduğu modül/dosya adı
   * @param func - Logun çağrıldığı fonksiyon adı
   * @param message - Uyarı mesajı
   * @param data - İsteğe bağlı ek veri kabukları
   * @example logger.warn('Auth', 'login', 'Kullanıcı oturumu kapatılmak üzere')
   */
  warn(module: string, func: string, message: string, data?: unknown): void {
    if (!env.app.isDev) return;
    console.warn(`${this._getPrefix(module, func)} ⚠️ ${message}`, data ?? '');
  },

  /**
   * Hata mesajlarını loglar. Standart hata formatını takip eder.
   * @param module - Logun ait olduğu modül/dosya adı
   * @param func - Logun çağrıldığı fonksiyon adı
   * @param message - Hata açıklama mesajı
   * @param error - Hata nesnesi veya detayı
   * @example logger.error('Database', 'saveResult', 'Veri kaydedilemedi', error)
   */
  error(module: string, func: string, message: string, error?: unknown): void {
    if (!env.app.isDev) return;

    const prefix = this._getPrefix(module, func);
    if (error instanceof Error) {
      console.error(`${prefix} ❌ ${message}:`, {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error(`${prefix} ❌ ${message}:`, error ?? '');
    }
  },

  /**
   * Loglar için standart öneki (prefix) oluşturur.
   * Format: [2026-03-03 22:15:00][MODULE][FUNCTION]
   * @private
   */
  _getPrefix(module: string, func: string): string {
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    return `[${timestamp}][${module.toUpperCase()}][${func}]`;
  },
};
