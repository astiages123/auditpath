import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

// ==========================================
// === UNIFIED LLM CLIENT ===
// ==========================================

const MODULE = 'UnifiedLLMClient';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  messages: LLMMessage[];
  provider?:
    | 'google'
    | 'openai'
    | 'anthropic'
    | 'cerebras'
    | 'deepseek'
    | 'mimo';
  model?: string;
  temperature?: number;
  max_tokens?: number;
  usage_type?: string;
}

/**
 * Farklı LLM sağlayıcılarını tek bir arayüz altında toplayan istemci.
 * Supabase Edge Function (ai-proxy) üzerinden güvenli erişim sağlar.
 */
export const UnifiedLLMClient = {
  /**
   * Tamamlama (completions) isteği gönderir.
   */
  async complete(
    options: LLMCompletionOptions
  ): Promise<{ content: string | null }> {
    const FUNC = 'complete';
    const startTime = Date.now();

    try {
      logger.info(MODULE, FUNC, 'İstek gönderiliyor:', {
        provider: options.provider || 'default',
        model: options.model,
        usage_type: options.usage_type,
      });

      // Supabase Edge Function çağrısı
      // timeout kontrolü frontend tarafında veya invoke options ile yönetilebilir.
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: options,
      });

      const latency = Date.now() - startTime;

      if (error) {
        logger.error(MODULE, FUNC, `Proxy hatası (${latency}ms):`, error);
        return { content: null };
      }

      // OpenAI uyumlu formatta yanıtı işle (choices[0].message.content)
      // ai-proxy doğrudan bu formatı dönmektedir.
      const content = data?.choices?.[0]?.message?.content || null;

      if (!content) {
        logger.warn(MODULE, FUNC, `Boş yanıt alındı (${latency}ms)`);
      } else {
        logger.info(MODULE, FUNC, `Yanıt başarılı (${latency}ms)`, {
          length: content.length,
        });
      }

      return { content };
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error(MODULE, FUNC, `Beklenmedik hata (${latency}ms):`, error);
      return { content: null };
    }
  },
};
