import { ContentType, sanitizeString } from './htmlSanitizer';

/**
 * Deep sanitizes an object using DOMPurify
 * @param obj - The object to sanitize
 * @param contentType - The sanitization strategy to use
 */
export function deepSanitize<T>(
  obj: T,
  contentType: ContentType = 'strict'
): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, contentType) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitize(item, contentType)) as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = deepSanitize(value, contentType);
    }
    return sanitized as T;
  }

  return obj;
}
