import { env } from '@/utils/env';
import * as Repository from "./quizRepository";
import { rateLimiter } from "@/features/quiz/logic/quizRateLimit"; // Or relative ../logic/quizRateLimit
import { logger } from "@/utils/logger";
import {
  type AIResponse,
  type LLMProvider,
  type LogCallback,
  type Message,
} from "@/features/quiz/types";

interface LLMClientOptions {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  usageType?: string;
  onLog?: LogCallback;
}

const PROXY_URL = `${env.supabase.url}/functions/v1/ai-proxy`;

export class UnifiedLLMClient {
  static async generate(
    messages: Message[],
    options: LLMClientOptions,
  ): Promise<AIResponse> {
    const {
      provider,
      model,
      temperature = 0.3,
      maxTokens = 8192,
      usageType,
      onLog,
    } = options;

    const effectiveModel = model ||
      (provider === "cerebras"
        ? "gpt-oss-120b"
        : provider === "google"
        ? "gemini-2.5-flash"
        : "mimo-v2-flash");

    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === "user");
    const contextLength = lastUserMessage?.content.length || 0;

    logger.info(`[${provider}] İstek başlatılıyor (Proxy)...`);
    onLog?.(`${provider} API çağrısı başlatılıyor...`, {
      promptLength: contextLength,
      model: effectiveModel,
      messageCount: messages.length,
    });

    // Auth
    const accessToken = await Repository.getCurrentSessionToken();
    if (!accessToken) {
      throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");
    }

    const requestBody = {
      provider,
      model: effectiveModel,
      messages,
      temperature,
      max_tokens: maxTokens,
      usage_type: usageType,
    };

    try {
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Rate Limiter Sync (mainly for Cerebras headers)
      rateLimiter.syncHeaders(response.headers, provider);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[${provider} Proxy] API Hatası: ${response.status}`, {
          status: response.status,
          // Don't log full errorText to prevent sensitive data leakage
        });
        onLog?.(`${provider} API hatası`, {
          status: response.status,
          body: "[REDACTED FOR SECURITY]",
        });
        throw new Error(
          `${provider} API Hatası (${response.status}): ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          prompt_tokens_details?: { cached_tokens?: number };
        };
      };

      const content = data.choices?.[0]?.message?.content || "";
      const usageRaw = data.usage;
      const cachedTokens = usageRaw?.prompt_tokens_details?.cached_tokens || 0;

      if (cachedTokens > 0) {
        logger.debug(`[AI Cache] Hit: ${cachedTokens} tokens`);
      }

      onLog?.(`${provider} API yanıtı alındı`, {
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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[${provider}] İstek hatası`, new Error(errorMsg));
      throw error;
    }
  }
}
