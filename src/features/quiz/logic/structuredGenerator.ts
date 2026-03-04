import { z } from 'zod';
import type { LLMProvider, Message } from '@/features/quiz/types';
import { UnifiedLLMClient } from '@/features/quiz/services/quizInfoService';
import { logger } from '@/utils/logger';
import { type AITask, getTaskConfig } from '@/utils/aiConfig';

// === SECTION: Types & Constants ===

/** Yapılandırılmış üretim seçenekleri */
export interface StructuredOptions<T> {
  schema: z.ZodSchema<T>;
  maxTokens?: number;
  provider?: LLMProvider;
  task?: AITask;
  temperature?: number;
  maxRetries?: number;
  retryPromptTemplate?: string;
  model?: 'smart' | 'fast';
  onLog?: (msg: string, details?: Record<string, unknown>) => void;
}

const DEFAULT_RETRY_PROMPT = `BİR ÖNCEKİ CEVABIN JSON ŞEMASINA UYMUYORDU. 
Lütfen cevabını SADECE geçerli bir JSON objesi olarak tekrar gönder. Markdown etiketi ( \`\`\`json ) kullanma.`;
const GOOGLE_MODEL = 'gemini-3-flash-preview';

// === SECTION: Generator Logic ===

/**
 * LLM'den belirli bir Zod şemasına uygun, yapılandırılmış çıktı üreten yardımcı fonksiyon.
 * @param messages - Gönderilecek mesaj geçmişi
 * @param options - Üretim seçenekleri
 * @returns Tabloya uygun parse edilmiş veri veya null
 */
export async function generate<T>(
  messages: Message[],
  options: StructuredOptions<T>
): Promise<T | null> {
  const {
    schema,
    maxRetries = 2,
    retryPromptTemplate = DEFAULT_RETRY_PROMPT,
    onLog,
  } = options;

  // Task bazlı model/provider/temperature seçimi
  // options.task varsa aiConfig'den doğru yapılandırmayı çek
  // yoksa model:'smart' → Gemini, default → Gemini
  let resolvedProvider = options.provider;
  let resolvedModel: string = GOOGLE_MODEL;
  let resolvedTemp = options.temperature ?? 0.2;

  if (options.task) {
    const taskConfig = getTaskConfig(options.task);
    resolvedProvider = resolvedProvider || (taskConfig.provider as LLMProvider);
    resolvedModel = taskConfig.model;
    resolvedTemp = options.temperature ?? taskConfig.temperature;
    onLog?.(
      `Task: ${options.task} → ${taskConfig.provider}/${taskConfig.model}`
    );
  } else if (options.model === 'smart') {
    resolvedModel = GOOGLE_MODEL;
    resolvedProvider = resolvedProvider || 'google';
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const isRetry = attempt > 0;
      const currentMessages = [...messages];

      if (isRetry) {
        currentMessages.push({
          role: 'user',
          content: retryPromptTemplate,
        });
        onLog?.(`Yeniden deneme (Retry) yapılıyor: #${attempt}`);
      }

      // LLM İsteği — task bazlı provider/model kullanılıyor
      const response = await UnifiedLLMClient.generate(currentMessages, {
        provider: resolvedProvider,
        model: resolvedModel,
        temperature: resolvedTemp,
        onLog,
      });

      if (
        response?.errorCode === 'AUTH_INVALID_JWT' ||
        response?.errorCode === 'AUTH_SESSION_INVALID'
      ) {
        onLog?.('Oturum doğrulama hatası nedeniyle üretim durduruldu.', {
          errorCode: response.errorCode,
        });
        return null;
      }

      if (!response || !response.content) {
        throw new Error('LLM boş bir yanıt döndürdü.');
      }

      // JSON Ayıklama
      let rawJson = response.content.trim();
      // Markdown bloklarını temizle
      rawJson = rawJson.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');

      let parsedData: unknown;
      try {
        parsedData = JSON.parse(rawJson);
      } catch (parseErr) {
        onLog?.('JSON parse hatası.', {
          rawPreview: rawJson.slice(0, 300),
          error: String(parseErr),
          attempt,
        });
        logger.error(
          'StructuredGenerator',
          'generate',
          `JSON parse hatası (Deneme ${attempt})`,
          { rawPreview: rawJson.slice(0, 300) }
        );
        continue;
      }

      // Zod Doğrulaması
      const validation = schema.safeParse(parsedData);
      if (validation.success) {
        return validation.data;
      }

      const zodErrors = validation.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      onLog?.('Şema doğrulama (validation) başarısız oldu.', {
        errors: zodErrors,
        attempt,
      });
      logger.error(
        'StructuredGenerator',
        'generate',
        `Zod validation hatası (Deneme ${attempt})`,
        { zodErrors, keysReceived: Object.keys(parsedData as object) }
      );
    } catch (error) {
      logger.error(
        'StructuredGenerator',
        'generate',
        `Beklenmedik hata (Deneme ${attempt})`,
        error
      );
      onLog?.(`Üretim hatası (Deneme ${attempt})`, { error: String(error) });
    }
  }

  logger.error(
    'StructuredGenerator',
    'generate',
    'Maksimum deneme sayısına ulaşıldı, çıktı üretilemedi.'
  );
  return null;
}
