import { z } from 'zod';
import type { AIResponse, LLMProvider, Message } from '@/features/quiz/types';
import {
  rateLimiter,
  UnifiedLLMClient,
} from '@/features/quiz/services/quizInfoService';
import { parseJsonResponse } from './quizParser';
import { logger } from '@/utils/logger';

export interface StructuredOptions<T> {
  schema: z.ZodSchema<T>;
  maxTokens?: number;
  provider: LLMProvider;
  temperature?: number;
  maxRetries?: number;
  retryPromptTemplate?: string;
  model?: string;
  usageType?: string;
  onLog?: (msg: string, details?: Record<string, unknown>) => void;
}

const DEFAULT_RETRY_PROMPT = `BİR ÖNCEKİ CEVABIN JSON ŞEMASINA UYMUYORDU.\nLütfen geçerli bir JSON döndür.\nSadece JSON verisi gerekli.`;

export class StructuredGenerator {
  static async generate<T>(
    messages: Message[],
    options: StructuredOptions<T>
  ): Promise<T | null> {
    const {
      schema,
      provider,
      maxRetries = 2,
      retryPromptTemplate = DEFAULT_RETRY_PROMPT,
      onLog,
    } = options;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const isRetry = attempt > 0;
      const currentMessages = [...messages];

      if (isRetry) {
        currentMessages.push({
          role: 'user',
          content: retryPromptTemplate,
        });
        onLog?.(`Retry denemesi #${attempt}...`);
      }

      let lastResponse: AIResponse | null = null;
      try {
        const response: AIResponse = await rateLimiter.schedule(
          () =>
            UnifiedLLMClient.generate(currentMessages, {
              provider,
              model: options.model,
              temperature: options.temperature ?? 0.1,
              usageType: options.usageType,
              maxTokens: options.maxTokens,
              onLog,
            }),
          provider
        );
        lastResponse = response;

        const parsed = parseJsonResponse(response.content, 'object', onLog);

        if (!parsed) {
          onLog?.(`JSON Parse hatası (Deneme ${attempt + 1})`, {
            raw_content: response.content,
          });
          throw new Error('JSON Parsing failed completely');
        }

        const validation = schema.safeParse(parsed);

        if (validation.success) {
          return validation.data;
        } else {
          logger.error('!!! ZOD ERROR in field:', {
            error: validation.error.format(),
            context: 'Zod Validation',
          });
          const errorMsg = validation.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join(', ');
          onLog?.(`Validasyon hatası (Deneme ${attempt + 1})`, {
            error: errorMsg,
            raw_content: response.content,
          });
        }
      } catch (error) {
        onLog?.(`Generation hatası (Deneme ${attempt + 1})`, {
          error: String(error),
          raw_content: lastResponse?.content,
        });
      } finally {
        const { data: safeResponse } = z
          .object({
            usage: z
              .object({
                prompt_cache_hit_tokens: z.number().optional(),
                prompt_tokens_details: z
                  .object({
                    cached_tokens: z.number().optional(),
                  })
                  .optional(),
                prompt_cache_miss_tokens: z.number().optional(),
                prompt_tokens: z.number().optional(),
                total_tokens: z.number().optional(),
              })
              .optional(),
          })
          .safeParse(lastResponse);
        if (safeResponse?.usage) {
          const { usage } = safeResponse;
          const hits =
            usage.prompt_cache_hit_tokens ||
            usage.prompt_tokens_details?.cached_tokens ||
            0;
          if (hits > 0 || usage.prompt_cache_miss_tokens) {
            onLog?.('Cache Stats', {
              hits,
              misses: usage.prompt_cache_miss_tokens || 0,
              total: usage.total_tokens || 0,
            });
          }
        }
      }
    }

    return null;
  }
}
