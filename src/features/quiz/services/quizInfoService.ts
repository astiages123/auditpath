import { env } from '@/utils/env';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { rateLimiter } from '@/features/quiz/logic/quizCoreLogic';
import type { Database } from '@/types/database.types';
import {
  type AIResponse,
  type LLMProvider,
  type LogCallback,
  type Message,
} from '@/features/quiz/types';

// ============================================================================
// Quiz Repository (formerly quizRepository.ts)
// ============================================================================

// Note: getCurrentSessionToken is imported from quizCoreService.ts via quizService.ts
import { getCurrentSessionToken } from './quizCoreService';

/**
 * Repository for quiz-related database operations
 */
export const quizRepository = {
  async getQuestionById(questionId: string) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (error) throw error;
    return data;
  },

  async getQuestionsByChunk(chunkId: string) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('chunk_id', chunkId);

    if (error) throw error;
    return data || [];
  },

  async getUserQuestionStatus(userId: string, questionId: string) {
    const { data, error } = await supabase
      .from('user_question_status')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },
};

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
// Unified LLM Client (formerly quizClient.ts)
// ============================================================================

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
  mimo: 'mimo-v2-flash',
  deepseek: 'deepseek-chat',
};

const DEFAULT_CONFIG = {
  temperature: 0.3,
  maxTokens: 8192,
};

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
    const timeoutId = setTimeout(() => controller.abort(), 30000);
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
