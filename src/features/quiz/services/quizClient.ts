import { env } from '@/utils/env';
import { getCurrentSessionToken } from './repositories/quizRepository';
import { rateLimiter } from '@/features/quiz/logic/rateLimit';
import { logger } from '@/utils/logger';
import {
  type AIResponse,
  type LLMProvider,
  type LogCallback,
  type Message,
} from '@/features/quiz/types';

// --- Configuration & Constants ---

export interface LLMClientOptions {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  usageType?: string;
  onLog?: LogCallback;
}

const PROXY_URL = `${env.supabase.url}/functions/v1/ai-proxy`;

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  cerebras: 'gpt-oss-120b',
  google: 'gemini-2.5-flash',
  mimo: 'mimo-v2-flash', // Placeholder for mimo
  deepseek: 'deepseek-chat', // Placeholder for deepseek
};

const DEFAULT_CONFIG = {
  temperature: 0.3,
  maxTokens: 8192,
};

// --- Client Implementation ---

export class UnifiedLLMClient {
  static async generate(
    messages: Message[],
    options: LLMClientOptions
  ): Promise<AIResponse> {
    const {
      provider,
      model,
      temperature = DEFAULT_CONFIG.temperature,
      maxTokens = DEFAULT_CONFIG.maxTokens,
      usageType,
      onLog,
    } = options;

    const effectiveModel = model || DEFAULT_MODELS[provider] || 'gpt-oss-120b';

    this.logStart(provider, effectiveModel, messages, onLog);

    // Auth
    const accessToken = await getCurrentSessionToken();
    if (!accessToken) {
      throw new Error('Oturum bulunamadı. Lütfen giriş yapın.');
    }

    try {
      const response = await this.makeRequest(accessToken, {
        provider,
        model: effectiveModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        usage_type: usageType,
      });

      // Rate Limiter Sync
      rateLimiter.syncHeaders(response.headers, provider);

      if (!response.ok) {
        await this.handleError(response, provider, onLog);
      }

      const data = await response.json();
      return this.processResponse(data, provider, onLog);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutMsg =
          'Bağlantı zaman aşımına uğradı veya sunucu yanıt vermiyor. Tekrar deneniyor...';
        onLog?.(timeoutMsg);
        logger.error(`[${provider}] Zaman aşımı`, error);
        throw new Error(timeoutMsg);
      }

      logger.error(`[${provider}] İstek hatası`, new Error(errorMsg));
      throw error;
    }
  }

  private static logStart(
    provider: string,
    model: string,
    messages: Message[],
    onLog?: LogCallback
  ) {
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user');
    const contextLength = lastUserMessage?.content.length || 0;

    logger.info(`[${provider}] İstek başlatılıyor (Proxy)...`);
    onLog?.(`Bağlantı kuruluyor...`, {
      promptLength: contextLength,
      model,
      messageCount: messages.length,
    });
  }

  private static async makeRequest(
    token: string,
    body: Record<string, unknown>
  ) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static async handleError(
    response: Response,
    provider: string,
    onLog?: LogCallback
  ) {
    const errorText = await response.text();
    logger.error(`[${provider} Proxy] API Hatası: ${response.status}`, {
      status: response.status,
    });
    onLog?.(`${provider} API hatası`, {
      status: response.status,
      body: '[REDACTED FOR SECURITY]',
    });
    throw new Error(
      `${provider} API Hatası (${response.status}): ${errorText}`
    );
  }

  private static processResponse(
    data: {
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: {
          cached_tokens?: number;
        };
      };
    },
    provider: string,
    onLog?: LogCallback
  ): AIResponse {
    const content = data.choices?.[0]?.message?.content || '';
    const usageRaw = data.usage;
    const cachedTokens = usageRaw?.prompt_tokens_details?.cached_tokens || 0;

    if (cachedTokens > 0) {
      logger.debug(`[AI Cache] Hit: ${cachedTokens} tokens`);
    }

    onLog?.(`Bilgiler alındı...`, {
      responseLength: content.length,
      usage: usageRaw,
      cachedTokens,
    });

    return {
      content,
      usage: usageRaw
        ? {
            prompt_tokens: usageRaw.prompt_tokens,
            completion_tokens: usageRaw.completion_tokens,
            total_tokens: usageRaw.total_tokens,
            cached_tokens: cachedTokens,
          }
        : undefined,
    };
  }
}
