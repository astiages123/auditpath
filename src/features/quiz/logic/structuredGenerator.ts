import { z } from 'zod';
import type { LLMProvider, Message } from '@/features/quiz/types';
import { UnifiedLLMClient } from '@/features/quiz/services/quizInfoService';
import { logger } from '@/utils/logger';
import { type AITask } from '@/utils/aiConfig';

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

      // LLM İsteği
      const response = await UnifiedLLMClient.generate(currentMessages, {
        provider: options.provider,
        model: options.model === 'smart' ? 'google' : 'google', // Örnek model eşleme
        temperature: options.temperature ?? 0.2,
        onLog,
      });

      if (!response || !response.content) {
        throw new Error('LLM boş bir yanıt döndürdü.');
      }

      // JSON Ayıklama
      let rawJson = response.content.trim();
      // Markdown bloklarını temizle
      rawJson = rawJson.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');

      const parsedData = JSON.parse(rawJson);

      // Zod Doğrulaması
      const validation = schema.safeParse(parsedData);
      if (validation.success) {
        return validation.data;
      }

      onLog?.('Şema doğrulama (validation) başarısız oldu.', {
        errors: validation.error.issues,
        attempt,
      });
    } catch (error) {
      logger.error(
        'StructuredGenerator',
        'generate',
        `Hata (Deneme ${attempt})`,
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
