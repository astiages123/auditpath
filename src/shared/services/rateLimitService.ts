import { logger } from '@/utils/logger';

// ==========================================
// === RATE LIMIT SERVICE ===
// ==========================================

const MODULE = 'RateLimitService';

// Basit bir hafıza-içi (in-memory) sınır tutucu
const LIMITS = new Map<string, { count: number; expires: number }>();

/**
 * Uygulama içi hız sınırlama (Rate Limiting) servisi.
 */
export const RateLimitService = {
  /**
   * Belirli bir anahtar için limit kontrolü yapar.
   */
  async checkLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    const FUNC = 'checkLimit';
    try {
      const now = Date.now();
      const record = LIMITS.get(key);

      if (!record || record.expires < now) {
        LIMITS.set(key, { count: 1, expires: now + windowMs });
        return true;
      }

      if (record.count >= limit) {
        logger.warn(MODULE, FUNC, 'Hız sınırı aşıldı:', {
          key,
          count: record.count,
        });
        return false;
      }

      record.count++;
      return true;
    } catch (error) {
      logger.error(MODULE, FUNC, 'Hata:', error);
      return true; // Hata durumunda işlemi engelleme
    }
  },
};
