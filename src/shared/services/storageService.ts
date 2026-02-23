import { logger } from '../../utils/logger';
import { ContentType, deepSanitize } from '@/shared/utils/sanitizers';
import { DEFAULT_STORAGE_TTL_MS } from '@/utils/constants';

const storageLogger = logger.withPrefix('[StorageService]');

export interface StorageItem<T> {
  value: T;
  timestamp: number;
  version?: string;
}

export type { ContentType };

const DEFAULT_PREFIX = 'auditpath_';
const DEFAULT_TTL = DEFAULT_STORAGE_TTL_MS; // 24 hours

function safeParse<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    storageLogger.warn('Failed to parse JSON from localStorage', { error });
    return null;
  }
}

function getKey(key: string): string {
  return `${DEFAULT_PREFIX}${key}`;
}

export const storage = {
  get<T>(key: string): T | null {
    try {
      const fullKey = getKey(key);
      const item = localStorage.getItem(fullKey);
      const parsed = safeParse<StorageItem<T>>(item);

      if (!parsed) return null;

      if (DEFAULT_TTL && Date.now() - parsed.timestamp > DEFAULT_TTL) {
        this.remove(key);
        return null;
      }

      return deepSanitize(parsed.value);
    } catch (error) {
      storageLogger.error('Failed to get item from localStorage', {
        key,
        error,
      });
      return null;
    }
  },

  set<T>(key: string, value: T, options?: { version?: string }): void {
    const fullKey = getKey(key);
    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        version: options?.version,
      };
      localStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      storageLogger.error('Failed to set item in localStorage', { key, error });
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.cleanup();
        try {
          localStorage.setItem(
            fullKey,
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
  },

  remove(key: string): void {
    try {
      const fullKey = getKey(key);
      localStorage.removeItem(fullKey);
    } catch (error) {
      storageLogger.error('Failed to remove item from localStorage', {
        key,
        error,
      });
    }
  },

  clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DEFAULT_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (error) {
      storageLogger.error('Failed to clear localStorage', { error });
    }
  },

  cleanup(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DEFAULT_PREFIX)) {
          const item = safeParse<StorageItem<unknown>>(
            localStorage.getItem(key)
          );
          if (item && DEFAULT_TTL && now - item.timestamp > DEFAULT_TTL) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      storageLogger.info(`Cleaned up ${keysToRemove.length} expired items`);
    } catch (error) {
      storageLogger.error('Failed to cleanup localStorage', { error });
    }
  },

  batchSet<T>(items: Array<{ key: string; value: T; version?: string }>): void {
    items.forEach((item) => {
      this.set(item.key, item.value, { version: item.version });
    });
  },

  batchRemove(keys: string[]): void {
    keys.forEach((key) => this.remove(key));
  },

  getMany<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    keys.forEach((key) => {
      result[key] = this.get<T>(key);
    });
    return result;
  },
};
