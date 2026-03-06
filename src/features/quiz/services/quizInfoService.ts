import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { safeQuery } from '@/lib/supabaseHelpers';
import {
  type LLMErrorCode,
  UnifiedLLMClient as BaseLLMClient,
} from '@/lib/unified-llm';

const MODULE = 'QuizInfoService';

function throwQueryError(func: string, error: string | undefined): never {
  const errorObject = new Error(error || `${func} failed`);
  logger.error(MODULE, func, 'Hata:', errorObject);
  throw errorObject;
}

/**
 * Konu başlıkları için özel yönergeleri (subject guidelines) getirir.
 *
 * @param courseName - Kurs veya konu adı
 * @param _sectionTitle - İsteğe bağlı bölüm başlığı (şu an kullanılmıyor)
 * @returns Özel yönerge metni
 */
export async function getSubjectGuidelines(
  courseName: string
): Promise<string> {
  const FUNC = 'getSubjectGuidelines';

  const result = await safeQuery<{ instruction?: string }>(
    supabase
      .from('subject_guidelines')
      .select('instruction')
      .eq('subject_name', courseName)
      .maybeSingle(),
    `${FUNC} error`,
    { courseName }
  );

  if (!result.success) {
    throwQueryError(FUNC, result.error);
  }

  return result.data?.instruction || '';
}

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
  ): Promise<{ content: string | null; errorCode?: LLMErrorCode }> {
    const response = await BaseLLMClient.complete({
      messages: messages as {
        role: 'user' | 'system' | 'assistant';
        content: string;
      }[],
      provider: (options?.provider || 'google') as
        | 'google'
        | 'openai'
        | 'anthropic'
        | 'deepseek'
        | 'mimo'
        | 'cerebras',
      model: options?.model,
      temperature: options?.temperature,
    });

    if (options?.onLog) {
      options.onLog('LLM yanıtı alındı', {
        provider: options.provider,
        length: response.content?.length,
      });
    }

    return { content: response.content, errorCode: response.errorCode };
  },
};
