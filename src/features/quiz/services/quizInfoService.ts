import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { safeQuery } from '@/lib/supabaseHelpers';
import { UnifiedLLMClient as BaseLLMClient } from '@/lib/unified-llm';
import { RateLimitService } from '@/shared/services/rateLimitService';

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE = 'QuizInfoService';

// ============================================================================
// INFO & UTILITY SERVICES
// ============================================================================

/**
 * Konu başlıkları için özel yönergeleri (subject guidelines) getirir.
 *
 * @param courseName - Kurs veya konu adı
 * @param _sectionTitle - İsteğe bağlı bölüm başlığı (şu an kullanılmıyor)
 * @returns Özel yönerge metni
 */
export async function getSubjectGuidelines(
  courseName: string,
  _sectionTitle?: string
): Promise<string> {
  const FUNC = 'getSubjectGuidelines';
  try {
    // Caching logic can be added here
    const { data, success } = await safeQuery<{ instruction?: string }>(
      supabase
        .from('subject_guidelines')
        .select('instruction')
        .eq('subject_name', courseName)
        .maybeSingle(),
      `${FUNC} error`,
      { courseName }
    );

    if (success && data?.instruction) {
      return data.instruction;
    }
    return '';
  } catch (error) {
    console.error(`[${MODULE}][${FUNC}] Hata:`, error);
    logger.error(MODULE, FUNC, 'Hata:', error);
    return '';
  }
}

/**
 * Hız sınırlayıcı (Rate Limiter) servisine erişim sağlar.
 */
export const QuizRateLimiter = {
  /**
   * Belirli bir anahtar için isteğin sınırda olup olmadığını kontrol eder.
   *
   * @param key - Limit kontrolü için benzersiz anahtar
   * @param limit - Maksimum istek sayısı
   * @param windowMs - Süre penceresi (milisaniye)
   * @returns Limite ulaşılıp ulaşılmadığını belirten boolean (true: engellendi, false: izin verildi)
   */
  async check(key: string, limit: number, windowMs: number): Promise<boolean> {
    const FUNC = 'QuizRateLimiter.check';
    try {
      return await RateLimitService.checkLimit(key, limit, windowMs);
    } catch (error) {
      console.error(`[${MODULE}][${FUNC}] Hata:`, error);
      logger.error(MODULE, 'QuizRateLimiter.check', 'Hata:', error);
      return true; // Hata durumunda güvenli tarafta kalıp limit dolmuş gibi davran
    }
  },
};

/**
 * Quiz modülü için özelleştirilmiş Unified LLM istemcisi.
 */
export const UnifiedLLMClient = {
  /**
   * LLM üzerinden içerik üretir.
   *
   * @param messages - Gönderilecek mesaj listesi
   * @param options - Üretim ayarları (provider, model, temperature, vb.)
   * @returns Üretilen içerik veya null
   */
  async generate(
    messages: { role: string; content: string }[],
    options?: {
      provider?: string;
      model?: string;
      temperature?: number;
      onLog?: (msg: string, details?: Record<string, unknown>) => void;
    }
  ): Promise<{ content: string | null }> {
    const FUNC = 'UnifiedLLMClient.generate';
    try {
      // BaseLLMClient options structure includes provider as Enum or String
      // Casting provider to any to match BaseLLMClient expected union type easily
      const response = await BaseLLMClient.complete({
        messages: messages as {
          role: 'user' | 'system' | 'assistant';
          content: string;
        }[],
        provider: (options?.provider || 'google') as
          | 'google'
          | 'openai'
          | 'anthropic',
        model: options?.model,
        temperature: options?.temperature,
      });

      if (options?.onLog) {
        options.onLog('LLM yanıtı alındı', {
          provider: options.provider,
          length: response.content?.length,
        });
      }

      return { content: response.content };
    } catch (error) {
      console.error(`[${MODULE}][${FUNC}] Hata:`, error);
      logger.error(MODULE, FUNC, 'LLM Üretim Hatası:', error);
      return { content: null };
    }
  },
};
