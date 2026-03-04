import { deepSanitize } from '@/shared/utils/sanitizers';
import { DEFAULT_STORAGE_TTL_MS } from '@/utils/constants';
import { logger } from '@/utils/logger';

// === TYPES ===

export interface StorageItem<T> {
  value: T;
  timestamp: number;
  version?: string;
}

// === CONSTANTS ===

const DEFAULT_BASE_PREFIX = 'auditpath_';
const DEFAULT_TTL = DEFAULT_STORAGE_TTL_MS; // 24 hours

// === HELPERS ===

/**
 * Safely parses JSON string with error handling
 */
function safeParse<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.error(
      'StorageService',
      'safeParse',
      'JSON parse hatası',
      error as Error
    );
    return null;
  }
}

/**
 * Gets the current user ID for storage key prefixing.
 */
function getCurrentUserId(): string | null {
  try {
    const authData = localStorage.getItem(`${DEFAULT_BASE_PREFIX}auth_user_id`);
    if (authData) return authData;

    // Fallback to checking supabase session if available in storage
    const sbKey = Object.keys(localStorage).find(
      (k) => k.includes('auth-token') && k.startsWith('sb-')
    );
    if (sbKey) {
      const data = JSON.parse(localStorage.getItem(sbKey) || '{}');
      return data?.user?.id || null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Prepends the application and user prefix to the key
 */
function getKey(key: string, userId?: string): string {
  const finalUserId = userId || getCurrentUserId();
  const prefix = finalUserId
    ? `${DEFAULT_BASE_PREFIX}${finalUserId}_`
    : DEFAULT_BASE_PREFIX;
  return `${prefix}${key}`;
}

/**
 * Migrates old non-user keys to user-specific keys if a user is logged in.
 */
export function migrateToUserSpecificKeys(userId: string): void {
  try {
    const keysToMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // If it starts with auditpath_ but DOES NOT have a UUID-like part following it
      if (
        key &&
        key.startsWith(DEFAULT_BASE_PREFIX) &&
        !key.includes(`_${userId}_`)
      ) {
        // Simple heuristic: if it's just auditpath_[key], it's old
        const suffix = key.slice(DEFAULT_BASE_PREFIX.length);
        if (!suffix.includes('_')) {
          keysToMigrate.push(key);
        }
      }
    }

    keysToMigrate.forEach((oldKey) => {
      const value = localStorage.getItem(oldKey);
      if (value) {
        const keySuffix = oldKey.slice(DEFAULT_BASE_PREFIX.length);
        const newKey = getKey(keySuffix, userId);
        localStorage.setItem(newKey, value);
        localStorage.removeItem(oldKey);
      }
    });
  } catch (e) {
    logger.error(
      'StorageService',
      'migrateToUserSpecificKeys',
      'Migration error',
      e as Error
    );
  }
}

export interface StorageOptions {
  version?: string;
  userId?: string;
}

// === SERVICE ===

export const storage = {
  /**
   * Retrieves an item from localStorage
   */
  get<T>(key: string, userId?: string): T | null {
    try {
      const fullKey = getKey(key, userId);
      const item = localStorage.getItem(fullKey);
      const parsed = safeParse<StorageItem<T>>(item);

      if (!parsed) return null;

      // Check for expiration
      if (DEFAULT_TTL && Date.now() - parsed.timestamp > DEFAULT_TTL) {
        this.remove(key, { userId });
        return null;
      }

      return deepSanitize(parsed.value);
    } catch (error) {
      logger.error(
        'StorageService',
        'get',
        'Veri okuma hatası',
        error as Error
      );
      return null;
    }
  },

  /**
   * Saves an item to localStorage
   */
  set<T>(key: string, value: T, options?: StorageOptions): void {
    try {
      const fullKey = getKey(key, options?.userId);
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        version: options?.version,
      };

      localStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      logger.error(
        'StorageService',
        'set',
        'Veri yazma hatası',
        error as Error
      );

      // Handle QuotaExceededError
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.cleanup();
        try {
          const fullKey = getKey(key, options?.userId);
          const item: StorageItem<T> = {
            value,
            timestamp: Date.now(),
            version: options?.version,
          };
          localStorage.setItem(fullKey, JSON.stringify(item));
        } catch (retryError) {
          logger.error(
            'StorageService',
            'set-retry',
            'Kota temizliği sonrası yazma hatası',
            retryError as Error
          );
        }
      }
    }
  },

  /**
   * Retrieves an item from sessionStorage
   */
  getSession<T>(key: string, userId?: string): T | null {
    try {
      const fullKey = getKey(key, userId);
      const item = sessionStorage.getItem(fullKey);
      const parsed = safeParse<StorageItem<T>>(item);

      if (!parsed) return null;

      return deepSanitize(parsed.value);
    } catch (error) {
      logger.error(
        'StorageService',
        'getSession',
        'Session veri okuma hatası',
        error as Error
      );
      return null;
    }
  },

  /**
   * Saves an item to sessionStorage
   */
  setSession<T>(key: string, value: T, options?: StorageOptions): void {
    try {
      const fullKey = getKey(key, options?.userId);
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        version: options?.version,
      };
      sessionStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      logger.error(
        'StorageService',
        'setSession',
        'Session veri yazma hatası',
        error as Error
      );
    }
  },

  /**
   * Removes an item from both localStorage and sessionStorage
   */
  remove(key: string, options?: { userId?: string }): void {
    try {
      const fullKey = getKey(key, options?.userId);
      localStorage.removeItem(fullKey);
      sessionStorage.removeItem(fullKey);
    } catch (error) {
      logger.error(
        'StorageService',
        'remove',
        'Veri silme hatası',
        error as Error
      );
    }
  },

  /**
   * Clears all application items from localStorage
   */
  clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DEFAULT_BASE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (error) {
      logger.error(
        'StorageService',
        'clear',
        'Tüm verileri temizleme hatası',
        error as Error
      );
    }
  },

  /**
   * Cleans up expired items from localStorage
   */
  cleanup(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DEFAULT_BASE_PREFIX)) {
          const item = safeParse<StorageItem<unknown>>(
            localStorage.getItem(key)
          );
          if (item && DEFAULT_TTL && now - item.timestamp > DEFAULT_TTL) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (error) {
      logger.error(
        'StorageService',
        'cleanup',
        'Eski verileri temizleme hatası',
        error as Error
      );
    }
  },

  /**
   * Saves multiple items to localStorage
   */
  batchSet<T>(
    items: Array<{ key: string; value: T; version?: string }>,
    userId?: string
  ): void {
    try {
      items.forEach((item) => {
        this.set(item.key, item.value, { version: item.version, userId });
      });
    } catch (error) {
      logger.error(
        'StorageService',
        'batchSet',
        'Toplu veri yazma hatası',
        error as Error
      );
    }
  },

  /**
   * Removes multiple items from localStorage
   */
  batchRemove(keys: string[], userId?: string): void {
    try {
      keys.forEach((key) => this.remove(key, { userId }));
    } catch (error) {
      logger.error(
        'StorageService',
        'batchRemove',
        'Toplu veri silme hatası',
        error as Error
      );
    }
  },

  /**
   * Retrieves multiple items from localStorage
   */
  getMany<T>(keys: string[], userId?: string): Record<string, T | null> {
    try {
      const result: Record<string, T | null> = {};
      keys.forEach((key) => {
        result[key] = this.get<T>(key, userId);
      });
      return result;
    } catch (error) {
      logger.error(
        'StorageService',
        'getMany',
        'Toplu veri okuma hatası',
        error as Error
      );
      return {};
    }
  },
};
