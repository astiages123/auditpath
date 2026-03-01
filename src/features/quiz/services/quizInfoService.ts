import { env } from '@/utils/env';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import pLimit from 'p-limit';
import { LLM_TIMEOUT_MS } from '@/utils/constants';
import type { Database } from '@/types/database.types';
import {
  type AIResponse,
  type LLMProvider,
  type LogCallback,
  type Message,
} from '@/features/quiz/types';
import { getCurrentSessionToken } from './quizCoreService';

// ============================================================================
// Subject Knowledge Service (formerly subjectKnowledgeService.ts)
// ============================================================================

type SubjectGuideline =
  Database['public']['Tables']['subject_guidelines']['Row'];

const cache = new Map<string, { data: SubjectGuideline; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let preloaded = false;

export async function preloadSubjectKnowledge(): Promise<void> {
  if (preloaded) return;

  try {
    const { data, error } = await supabase
      .from('subject_guidelines')
      .select('*');

    if (error) throw error;

    if (data) {
      const now = Date.now();
      data.forEach((item) => {
        cache.set(item.subject_name, { data: item, timestamp: now });
        if (item.subject_code) {
          cache.set(item.subject_code, {
            data: item,
            timestamp: now,
          });
        }
      });
    }
    preloaded = true;
  } catch (error) {
    logger.error('[SubjectKnowledgeService] Preload failed:', error as Error);
  }
}

export async function getSubjectGuidelines(
  subjectNameOrCode: string
): Promise<SubjectGuideline | null> {
  const now = Date.now();
  const cached = cache.get(subjectNameOrCode);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const query = supabase
    .from('subject_guidelines')
    .select('*')
    .eq('subject_name', subjectNameOrCode)
    .maybeSingle();

  let { data, error } = await query;

  if (!data && !error) {
    const { data: codeData, error: codeError } = await supabase
      .from('subject_guidelines')
      .select('*')
      .eq('subject_code', subjectNameOrCode)
      .maybeSingle();

    data = codeData;
    error = codeError;
  }

  if (error) {
    logger.error('[SubjectKnowledgeService] Fetch error:', error);
    return null;
  }

  if (data) {
    cache.set(subjectNameOrCode, { data, timestamp: now });
    if (data.subject_name !== subjectNameOrCode) {
      cache.set(data.subject_name, { data, timestamp: now });
    }
    if (data.subject_code && data.subject_code !== subjectNameOrCode) {
      cache.set(data.subject_code, { data, timestamp: now });
    }
  }

  return data;
}

export function clearSubjectKnowledgeCache(): void {
  cache.clear();
  preloaded = false;
}

export const subjectKnowledgeService = {
  preload: preloadSubjectKnowledge,
  getGuidelines: getSubjectGuidelines,
  clearCache: clearSubjectKnowledgeCache,
};

// ============================================================================
// Rate Limiter (formerly in quizCoreLogic.ts)
// ============================================================================

interface Budget {
  remaining: number;
  reset: number;
}

export class RateLimitService {
  private limit = pLimit(1);
  private budgets: Map<LLMProvider, Budget> = new Map();

  syncHeaders(headers: Headers, provider: LLMProvider) {
    const remaining =
      headers.get('x-ratelimit-remaining-tokens') ||
      headers.get('x-ratelimit-remaining');
    const reset =
      headers.get('x-ratelimit-reset-tokens') ||
      headers.get('x-ratelimit-reset');

    if (remaining) {
      const resetVal = reset ? parseFloat(reset) : 60;
      if (Number.isNaN(resetVal)) {
        logger.warn(`[RateLimit] Invalid reset value for ${provider}`);
        return;
      }
      const resetTime =
        resetVal < 1000000 ? Date.now() + resetVal * 1000 : resetVal;
      const parsedRemaining = parseInt(remaining, 10);

      if (Number.isNaN(parsedRemaining)) {
        logger.warn(`[RateLimit] Invalid remaining value for ${provider}`);
        return;
      }

      this.budgets.set(provider, {
        remaining: parsedRemaining,
        reset: resetTime,
      });

      if (parsedRemaining < 500) {
        logger.warn(
          `[RateLimit] Critical: ${provider} budget low (${remaining} tokens). Reset in ${Math.ceil(
            (resetTime - Date.now()) / 1000
          )}s`
        );
      }
    }
  }

  async schedule<T>(task: () => Promise<T>, provider: LLMProvider): Promise<T> {
    return this.limit(async () => {
      const budget = this.budgets.get(provider);
      if (budget && budget.remaining <= 0) {
        const waitTime = budget.reset - Date.now();
        if (waitTime > 0) {
          logger.info(
            `[RateLimit] Waiting ${Math.ceil(
              waitTime / 1000
            )}s for ${provider} budget reset...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
      return task();
    });
  }
}

export const rateLimiter = new RateLimitService();

// ============================================================================
// Unified LLM Client (formerly quizClient.ts)
// ============================================================================

import { type AITask, getTaskConfig } from '@/utils/aiConfig';

export interface LLMClientOptions {
  provider?: LLMProvider;
  model?: string;
  task?: AITask;
  temperature?: number;
  maxTokens?: number;
  usageType?: string;
  onLog?: LogCallback;
}

const PROXY_URL = `${env.supabase.url}/functions/v1/ai-proxy`;

const DEFAULT_CONFIG = {
  temperature: 0.7,
  maxTokens: 8192,
};

export class UnifiedLLMClient {
  static async generate(
    messages: Message[],
    options: LLMClientOptions
  ): Promise<AIResponse> {
    const { task, usageType, onLog } = options;

    // Task config override
    const taskConfig = task ? getTaskConfig(task) : null;
    const fallbackConfig = getTaskConfig('drafting'); // Global baseline

    const effectiveProvider =
      options.provider || taskConfig?.provider || fallbackConfig.provider;
    const effectiveModel =
      options.model || taskConfig?.model || fallbackConfig.model;
    const effectiveTemp =
      options.temperature ??
      taskConfig?.temperature ??
      fallbackConfig.temperature;
    const effectiveMaxTokens = options.maxTokens ?? DEFAULT_CONFIG.maxTokens;

    this.logStart(effectiveProvider, effectiveModel, messages, onLog);

    const accessToken = await getCurrentSessionToken();
    if (!accessToken) {
      throw new Error('Oturum bulunamadı. Lütfen giriş yapın.');
    }

    try {
      const response = await this.makeRequest(accessToken, {
        provider: effectiveProvider,
        model: effectiveModel,
        messages,
        temperature: effectiveTemp,
        max_tokens: effectiveMaxTokens,
        usage_type: usageType || task || 'general',
      });

      rateLimiter.syncHeaders(response.headers, effectiveProvider);

      if (!response.ok) {
        await this.handleError(response, effectiveProvider, onLog);
      }

      const data = await response.json();
      return this.processResponse(data, effectiveProvider, onLog);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutMsg =
          'Bağlantı zaman aşımına uğradı veya sunucu yanıt vermiyor. Tekrar deneniyor...';
        onLog?.(timeoutMsg);
        logger.error(`[${effectiveProvider}] Zaman aşımı`, error);
        throw new Error(timeoutMsg);
      }
      logger.error(`[${effectiveProvider}] İstek hatası`, new Error(errorMsg));
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
    const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
    try {
      return await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
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
      body: '[REDACTED]',
    });
    throw new Error(
      `${provider} API Hatası (${response.status}): ${errorText}`
    );
  }

  private static processResponse(
    data: unknown,
    provider: string,
    onLog?: LogCallback
  ): AIResponse {
    const dataObj = data as {
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number };
      };
    };
    const content = dataObj.choices?.[0]?.message?.content || '';
    const usageRaw = dataObj.usage;
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
            prompt_tokens: usageRaw.prompt_tokens ?? 0,
            completion_tokens: usageRaw.completion_tokens ?? 0,
            total_tokens: usageRaw.total_tokens ?? 0,
            cached_tokens: cachedTokens,
          }
        : undefined,
    };
  }
}
