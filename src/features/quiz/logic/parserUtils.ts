import { logger } from '@/utils/logger';

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
    cleanText = cleanText
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*/gi, '')
      .trim();

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
        error: e as Error,
        context: 'Quiz Utils',
      });
      return null;
    }
  } catch (e) {
    logger.error('JSON Parse Error (Critical):', {
      error: e as Error,
      context: 'Quiz Utils',
    });
    return null;
  }
}
