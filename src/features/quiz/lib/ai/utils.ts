import { logger } from '@/shared/lib/core/utils/logger';
import { z } from 'zod';
import type {
  AIResponse,
  LLMProvider,
  Message,
} from '@/features/quiz/core/types';
import { UnifiedLLMClient } from '@/features/quiz/api/client';
import { rateLimiter } from '@/features/quiz/api/rate-limit';
import { COMMON_OUTPUT_FORMATS, GENERAL_QUALITY_RULES } from './prompts';
import { env } from '@/config/env';

export class DebugLogger {
  private static isEnabled = env.app.isDev;

  private static styles = {
    group: 'color: #3b82f6; font-weight: bold;', // blue-500
    input: 'color: #a855f7;', // purple-500
    process: 'color: #eab308;', // yellow-500
    output: 'color: #22c55e;', // green-500
    db: 'color: #f97316;', // orange-500
    error: 'color: #ef4444; font-weight: bold;', // red-500
  };

  /**
   * Start a new log group
   */
  static group(name: string, data?: Record<string, unknown>) {
    if (!this.isEnabled) return;

    const hasGroupCollapsed =
      typeof console !== 'undefined' && 'groupCollapsed' in console;
    if (hasGroupCollapsed) {
      // eslint-disable-next-line no-console
      console.groupCollapsed(`%c🔧 ${name}`, this.styles.group);
      if (data) {
        // eslint-disable-next-line no-console
        console.log('Details:', data);
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(`--- ${name} ---`, data || '');
    }
  }

  /**
   * End the current log group
   */
  static groupEnd() {
    if (!this.isEnabled) return;
    const hasGroupEnd = typeof console !== 'undefined' && 'groupEnd' in console;
    if (hasGroupEnd) {
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }

  /**
   * Log an input step
   */
  static input(message: string, data?: unknown) {
    if (!this.isEnabled) return;
    this.logWithStyle('⬇️ INPUT', message, this.styles.input, data);
  }

  /**
   * Log a processing step
   */
  static process(message: string, data?: unknown) {
    if (!this.isEnabled) return;
    this.logWithStyle('⚡ PROCESS', message, this.styles.process, data);
  }

  /**
   * Log an output step
   */
  static output(message: string, data?: unknown) {
    if (!this.isEnabled) return;
    this.logWithStyle('✅ OUTPUT', message, this.styles.output, data);
  }

  /**
   * Log a database operation request
   */
  static db(operation: string, table: string, data?: unknown) {
    if (!this.isEnabled) return;
    const msg = `${operation} on [${table}]`;
    this.logWithStyle('🗄️ DB', msg, this.styles.db, data);
  }

  /**
   * Log an error
   */
  static error(message: string, error?: unknown) {
    logger.error(`❌ ERROR: ${message}`, {
      error,
      style: this.styles.error,
    });
  }

  /**
   * Quick table view
   */
  static table(data: unknown) {
    if (!this.isEnabled) return;

    // eslint-disable-next-line no-console
    console.table(data);
  }

  private static logWithStyle(
    prefix: string,
    message: string,
    style: string,
    data?: unknown
  ) {
    if (data !== undefined) {
      // eslint-disable-next-line no-console
      console.log(`%c${prefix}: ${message}`, style, data);
    } else {
      // eslint-disable-next-line no-console
      console.log(`%c${prefix}: ${message}`, style);
    }
  }
}

/**
 * Timer Logic Utility
 */
export function createTimer() {
  let startTime: number | null = null;
  let accumulatedTime = 0;

  return {
    start: () => {
      if (startTime === null) startTime = Date.now();
    },
    stop: () => {
      if (startTime !== null) {
        accumulatedTime += Date.now() - startTime;
        startTime = null;
      }
      return accumulatedTime;
    },
    reset: () => {
      startTime = Date.now();
      accumulatedTime = 0;
    },
    clear: () => {
      startTime = null;
      accumulatedTime = 0;
    },
    getTime: () => {
      if (startTime !== null) {
        return accumulatedTime + (Date.now() - startTime);
      }
      return accumulatedTime;
    },
  };
}

// --- Parser Logic ---

/**
 * Parse JSON from LLM response (simple extraction)
 */
export function parseJsonResponse(
  text: string | null | undefined,
  type: 'object' | 'array',
  onLog?: (msg: string, details?: Record<string, unknown>) => void
): unknown {
  if (!text || typeof text !== 'string') return null;

  try {
    let cleanText = text.trim();

    // 0. </think>...</think> bloklarını temizle (Qwen modelleri bunu ekliyor)
    cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 1. Markdown bloklarını temizle (```json ... ``` veya sadece ``` ... ```)
    const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (markdownMatch) {
      cleanText = markdownMatch[1].trim();
    }

    // 2. Daha güvenli JSON ayıklama - indexOf ve lastIndexOf kullanarak
    const firstChar = type === 'array' ? '[' : '{';
    const lastChar = type === 'array' ? ']' : '}';
    const start = cleanText.indexOf(firstChar);
    const end = cleanText.lastIndexOf(lastChar);

    if (start !== -1) {
      if (end !== -1 && end > start) {
        cleanText = cleanText.substring(start, end + 1);
      } else {
        // Truncated or invalid end - take from start onwards to let forgiving parser try
        cleanText = cleanText.substring(start);
      }
    } else {
      onLog?.('Geçerli JSON yapısı bulunamadı', {
        text: cleanText.substring(0, 100),
      });
      return null;
    }
    // 3. LaTeX Backslash Düzeltme (PRE-PROCESS)
    const regex = /(\\["\\/nrt]|\\u[0-9a-fA-F]{4})|(\\)/g;

    cleanText = cleanText.replace(regex, (match, valid, invalid) => {
      if (valid) return valid;
      if (invalid) return '\\\\';
      return match;
    });

    // 4. Forgiving JSON Parser for Truncated Responses
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      const closers = ['}', ']', '"}', '"]', '}', ']', ']}', '}}'];

      for (const closer of closers) {
        try {
          return JSON.parse(cleanText + closer);
        } catch {
          continue;
        }
      }

      logger.warn('JSON Parse Error (Unrecoverable):', {
        error: e,
        context: 'Quiz Utils',
      });
      return null;
    }
  } catch (e) {
    logger.error('JSON Parse Error (Critical):', {
      error: e,
      context: 'Quiz Utils',
    });
    return null;
  }
}

// --- Structured Generator Logic ---

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

const DEFAULT_RETRY_PROMPT = `BİR ÖNCEKİ CEVABIN JSON ŞEMASINA UYMUYORDU.
Lütfen geçerli bir JSON döndür.
Sadece JSON verisi gerekli.`;

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
          .object({ usage: z.any().optional() })
          .safeParse(lastResponse);
        if (safeResponse?.usage) {
          const { usage } = safeResponse;
          if (usage.prompt_cache_hit_tokens || usage.prompt_cache_miss_tokens) {
            onLog?.('Cache Stats', {
              hits: usage.prompt_cache_hit_tokens || 0,
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

export class PromptArchitect {
  static assemble(
    systemPrompt: string,
    contextPrompt: string,
    taskPrompt: string
  ): Message[] {
    const fixedContext = this.normalizeText(contextPrompt);
    const dynamicTask = this.normalizeText(taskPrompt);

    return [
      { role: 'system', content: this.normalizeText(systemPrompt) },
      {
        role: 'user',
        content: `${fixedContext}\n\n--- GÖREV ---\n${dynamicTask}`,
      },
    ];
  }

  static buildContext(
    content: string,
    courseName?: string,
    sectionTitle?: string,
    guidelines?: {
      instruction?: string;
      few_shot_example?: unknown;
      bad_few_shot_example?: unknown;
    } | null
  ): string {
    const parts: string[] = [];

    if (courseName && courseName.trim()) {
      parts.push(`## DERS: ${courseName.trim()}`);
    }
    if (sectionTitle && sectionTitle.trim()) {
      parts.push(`## KONU: ${sectionTitle.trim()}`);
    }

    if (guidelines) {
      parts.push('## DERS REHBERİ VE KURALLAR:');
      if (guidelines.instruction && guidelines.instruction.trim()) {
        parts.push(`### TEKNİK KURALLAR\n${guidelines.instruction.trim()}`);
      }
      if (guidelines.few_shot_example) {
        const exampleStr = JSON.stringify(guidelines.few_shot_example, null, 2);
        parts.push(`\n### İYİ ÖRNEK (Bunu model al):\n${exampleStr}`);
      }
      if (guidelines.bad_few_shot_example) {
        const badExampleStr = JSON.stringify(
          guidelines.bad_few_shot_example,
          null,
          2
        );
        parts.push(`\n### KÖTÜ ÖRNEK (Bundan kaçın):\n${badExampleStr}`);
      }
    }

    parts.push(GENERAL_QUALITY_RULES);
    parts.push(COMMON_OUTPUT_FORMATS);
    parts.push('## BAĞLAM METNİ:');
    parts.push(this.normalizeText(content));

    return parts
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .join('\n\n');
  }

  static cleanReferenceImages(content: string): string {
    return content.replace(/!\[[^\]]*\]\([^)]+\)/g, '[GÖRSEL]');
  }

  private static normalizeText(text: string): string {
    return text.replace(/\r\n/g, '\n').trim();
  }
}
