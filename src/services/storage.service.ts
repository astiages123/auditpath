/**
 * Storage Service
 *
 * Centralized localStorage management with type safety,
 * error handling, and XSS protection using DOMPurify.
 */

import DOMPurify from 'dompurify';
import { logger } from '../utils/logger';

const storageLogger = logger.withPrefix('[StorageService]');

export interface StorageItem<T> {
  value: T;
  timestamp: number;
  version?: string;
}

export interface StorageOptions {
  prefix?: string;
  ttl?: number; // Time to live in milliseconds
  version?: string;
}

const DEFAULT_PREFIX = 'auditpath_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Safely parses JSON with error handling
 */
function safeParse<T>(json: string | null): T | null {
  if (!json) return null;

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    storageLogger.warn('Failed to parse JSON from localStorage', { error });
    return null;
  }
}

/**
 * Content type for sanitization strategy
 */
export type ContentType = 'strict' | 'markdown' | 'raw';

/**
 * DOMPurify configuration for STRICT sanitization
 * Removes ALL HTML tags - suitable for plain text data
 */
const STRICT_CONFIG = {
  USE_PROFILES: { html: false },
  ALLOWED_TAGS: [] as string[],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'embed', 'link'],
  FORBID_ATTR: [
    'onerror',
    'onload',
    'onclick',
    'onmouseover',
    'onmouseout',
    'onmousedown',
    'onmouseup',
    'onmousemove',
    'onkeypress',
    'onkeydown',
    'onkeyup',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit',
    'onreset',
    'onselect',
  ],
};

/**
 * DOMPurify configuration for MARKDOWN content
 * Allows safe HTML tags that are commonly used in Markdown
 */
const MARKDOWN_CONFIG = {
  ALLOWED_TAGS: [
    // Text formatting
    'b',
    'strong',
    'i',
    'em',
    'u',
    'mark',
    'small',
    'del',
    'ins',
    'sub',
    'sup',
    // Headings
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    // Lists
    'ul',
    'ol',
    'li',
    'dl',
    'dt',
    'dd',
    // Links
    'a',
    // Code
    'code',
    'pre',
    'kbd',
    'samp',
    // Tables
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'td',
    'th',
    'caption',
    'colgroup',
    'col',
    // Block elements
    'blockquote',
    'p',
    'br',
    'hr',
    'div',
    'span',
    // Media
    'img',
    'figure',
    'figcaption',
    // Details/Summary
    'details',
    'summary',
    // SVG for Mermaid
    'svg',
    'path',
    'rect',
    'circle',
    'line',
    'polyline',
    'polygon',
    'text',
    'g',
    'defs',
    'marker',
    'use',
    'foreignObject',
  ],
  ALLOWED_ATTR: [
    // General attributes
    'class',
    'id',
    'title',
    'dir',
    'lang',
    'role',
    'aria-label',
    'aria-hidden',
    // Link attributes
    'href',
    'target',
    'rel',
    // Image attributes
    'src',
    'alt',
    'width',
    'height',
    'loading',
    // Table attributes
    'colspan',
    'rowspan',
    'scope',
    // Code attributes
    'data-language',
    'class', // for syntax highlighting
    // SVG attributes
    'viewBox',
    'd',
    'fill',
    'stroke',
    'stroke-width',
    'transform',
    'cx',
    'cy',
    'r',
    'x',
    'y',
    'points',
    'marker-end',
    'marker-start',
    'xmlns',
    'xmlns:xlink',
    'preserveAspectRatio',
  ],
  FORBID_TAGS: [
    'script',
    'style',
    'iframe',
    'form',
    'object',
    'embed',
    'link',
    'meta',
    'head',
  ],
  FORBID_ATTR: [
    'onerror',
    'onload',
    'onclick',
    'onmouseover',
    'onmouseout',
    'onmousedown',
    'onmouseup',
    'onmousemove',
    'onkeypress',
    'onkeydown',
    'onkeyup',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit',
    'onreset',
    'onselect',
  ],
  ALLOW_DATA_ATTR: false,
  SANITIZE_DOM: true,
  // Only allow safe URL protocols
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

/**
 * Sanitizes a string value using DOMPurify
 * @param value - The string to sanitize
 * @param contentType - The sanitization strategy to use
 */
function sanitizeString(
  value: string,
  contentType: ContentType = 'strict'
): string {
  if (typeof value !== 'string') return value;

  if (contentType === 'raw') {
    return value;
  }

  const config = contentType === 'markdown' ? MARKDOWN_CONFIG : STRICT_CONFIG;
  return DOMPurify.sanitize(value, config);
}

/**
 * Deep sanitizes an object using DOMPurify
 * @param obj - The object to sanitize
 * @param contentType - The sanitization strategy to use
 */
function deepSanitize<T>(obj: T, contentType: ContentType = 'strict'): T {
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

/**
 * StorageService class
 * Centralized localStorage operations with type safety and security
 */
export class StorageService {
  readonly prefix: string;
  readonly defaultTtl: number;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || DEFAULT_PREFIX;
    this.defaultTtl = options.ttl || DEFAULT_TTL;
  }

  /**
   * Gets the full key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Retrieves an item from localStorage
   */
  get<T>(key: string): T | null {
    try {
      const fullKey = this.getKey(key);
      const item = localStorage.getItem(fullKey);
      const parsed = safeParse<StorageItem<T>>(item);

      if (!parsed) return null;

      // Check TTL
      if (this.defaultTtl && Date.now() - parsed.timestamp > this.defaultTtl) {
        this.remove(key);
        return null;
      }

      // Sanitize the value before returning
      return deepSanitize(parsed.value);
    } catch (error) {
      storageLogger.error('Failed to get item from localStorage', {
        key,
        error,
      });
      return null;
    }
  }

  /**
   * Retrieves raw data without TTL check
   */
  getRaw<T>(key: string): StorageItem<T> | null {
    try {
      const fullKey = this.getKey(key);
      const item = localStorage.getItem(fullKey);
      return safeParse<StorageItem<T>>(item);
    } catch (error) {
      storageLogger.error('Failed to get raw item from localStorage', {
        key,
        error,
      });
      return null;
    }
  }

  /**
   * Stores an item in localStorage
   */
  set<T>(
    key: string,
    value: T,
    options?: { ttl?: number; version?: string }
  ): void {
    try {
      const fullKey = this.getKey(key);
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        version: options?.version,
      };

      localStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      storageLogger.error('Failed to set item in localStorage', { key, error });

      // Handle quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.cleanup();
        // Retry once
        try {
          localStorage.setItem(
            this.getKey(key),
            JSON.stringify({
              value,
              timestamp: Date.now(),
              version: options?.version,
            })
          );
        } catch (retryError) {
          storageLogger.error('Retry failed after cleanup', {
            key,
            retryError,
          });
        }
      }
    }
  }

  /**
   * Removes an item from localStorage
   */
  remove(key: string): void {
    try {
      const fullKey = this.getKey(key);
      localStorage.removeItem(fullKey);
    } catch (error) {
      storageLogger.error('Failed to remove item from localStorage', {
        key,
        error,
      });
    }
  }

  /**
   * Clears all items with the current prefix
   */
  clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      storageLogger.error('Failed to clear localStorage', { error });
    }
  }

  /**
   * Gets the timestamp of an item
   */
  getTimestamp(key: string): number | null {
    const item = this.getRaw<unknown>(key);
    return item?.timestamp || null;
  }

  /**
   * Checks if an item exists and is not expired
   */
  has(key: string): boolean {
    return this.get<unknown>(key) !== null;
  }

  /**
   * Returns all keys with the current prefix
   */
  keys(): string[] {
    try {
      const result: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          result.push(key.slice(this.prefix.length));
        }
      }
      return result;
    } catch (error) {
      storageLogger.error('Failed to get keys from localStorage', { error });
      return [];
    }
  }

  /**
   * Cleanup expired items to free space
   */
  cleanup(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const item = safeParse<StorageItem<unknown>>(
            localStorage.getItem(key)
          );
          if (
            item &&
            this.defaultTtl &&
            now - item.timestamp > this.defaultTtl
          ) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
      storageLogger.info(`Cleaned up ${keysToRemove.length} expired items`);
    } catch (error) {
      storageLogger.error('Failed to cleanup localStorage', { error });
    }
  }
}

// Export singleton instance
export const storage = new StorageService();

// Export individual functions for convenience
export const getStorageItem = <T>(key: string): T | null => storage.get<T>(key);
export const setStorageItem = <T>(
  key: string,
  value: T,
  options?: { ttl?: number; version?: string }
): void => storage.set(key, value, options);
export const removeStorageItem = (key: string): void => storage.remove(key);
export const clearStorage = (): void => storage.clear();
export const hasStorageItem = (key: string): boolean => storage.has(key);

// Export deepSanitize for testing
export { deepSanitize, sanitizeString };
