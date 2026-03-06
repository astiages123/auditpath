import { deepSanitize } from '@/shared/utils/sanitizers';
import { DEFAULT_STORAGE_TTL_MS } from '@/utils/constants';

export interface StorageItem<T> {
  value: T;
  timestamp: number;
  version?: string;
}

export interface StorageOptions {
  version?: string;
  userId?: string;
}

const DEFAULT_BASE_PREFIX = 'auditpath_';
const DEFAULT_TTL = DEFAULT_STORAGE_TTL_MS;

function safeParse<T>(json: string | null): T | null {
  if (!json) return null;
  return JSON.parse(json) as T;
}

function getCurrentUserId(): string | null {
  const authData = localStorage.getItem(`${DEFAULT_BASE_PREFIX}auth_user_id`);
  if (authData) return authData;

  const supabaseKey = Object.keys(localStorage).find(
    (key) => key.includes('auth-token') && key.startsWith('sb-')
  );

  if (!supabaseKey) return null;

  const sessionData = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
  return sessionData?.user?.id || null;
}

function getKey(key: string, userId?: string): string {
  const finalUserId = userId || getCurrentUserId();
  const prefix = finalUserId
    ? `${DEFAULT_BASE_PREFIX}${finalUserId}_`
    : DEFAULT_BASE_PREFIX;
  return `${prefix}${key}`;
}

function createStorageItem<T>(
  value: T,
  options?: StorageOptions
): StorageItem<T> {
  return {
    value,
    timestamp: Date.now(),
    version: options?.version,
  };
}

/**
 * Migrates old non-user keys to user-specific keys if a user is logged in.
 */
export function migrateToUserSpecificKeys(userId: string): void {
  const keysToMigrate: string[] = [];

  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (
      key &&
      key.startsWith(DEFAULT_BASE_PREFIX) &&
      !key.includes(`_${userId}_`)
    ) {
      const suffix = key.slice(DEFAULT_BASE_PREFIX.length);
      if (!suffix.includes('_')) {
        keysToMigrate.push(key);
      }
    }
  }

  keysToMigrate.forEach((oldKey) => {
    const value = localStorage.getItem(oldKey);
    if (!value) return;

    const keySuffix = oldKey.slice(DEFAULT_BASE_PREFIX.length);
    const newKey = getKey(keySuffix, userId);
    localStorage.setItem(newKey, value);
    localStorage.removeItem(oldKey);
  });
}

export const storage = {
  /**
   * Retrieves an item from localStorage
   */
  get<T>(key: string, userId?: string): T | null {
    const fullKey = getKey(key, userId);
    const item = localStorage.getItem(fullKey);
    const parsed = safeParse<StorageItem<T>>(item);

    if (!parsed) return null;

    if (DEFAULT_TTL && Date.now() - parsed.timestamp > DEFAULT_TTL) {
      this.remove(key, { userId });
      return null;
    }

    return deepSanitize(parsed.value);
  },

  /**
   * Saves an item to localStorage
   */
  set<T>(key: string, value: T, options?: StorageOptions): void {
    const fullKey = getKey(key, options?.userId);
    const item = createStorageItem(value, options);

    localStorage.setItem(fullKey, JSON.stringify(item));
  },

  /**
   * Retrieves an item from sessionStorage
   */
  getSession<T>(key: string, userId?: string): T | null {
    const fullKey = getKey(key, userId);
    const item = sessionStorage.getItem(fullKey);
    const parsed = safeParse<StorageItem<T>>(item);

    if (!parsed) return null;

    return deepSanitize(parsed.value);
  },

  /**
   * Saves an item to sessionStorage
   */
  setSession<T>(key: string, value: T, options?: StorageOptions): void {
    const fullKey = getKey(key, options?.userId);
    const item = createStorageItem(value, options);
    sessionStorage.setItem(fullKey, JSON.stringify(item));
  },

  /**
   * Removes an item from both localStorage and sessionStorage
   */
  remove(key: string, options?: { userId?: string }): void {
    const fullKey = getKey(key, options?.userId);
    localStorage.removeItem(fullKey);
    sessionStorage.removeItem(fullKey);
  },

  /**
   * Clears all application items from localStorage
   */
  clear(): void {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key && key.startsWith(DEFAULT_BASE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },

  /**
   * Cleans up expired items from localStorage
   */
  cleanup(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(DEFAULT_BASE_PREFIX)) continue;

      const item = safeParse<StorageItem<unknown>>(localStorage.getItem(key));
      if (item && DEFAULT_TTL && now - item.timestamp > DEFAULT_TTL) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },

  /**
   * Saves multiple items to localStorage
   */
  batchSet<T>(
    items: Array<{ key: string; value: T; version?: string }>,
    userId?: string
  ): void {
    items.forEach((item) => {
      this.set(item.key, item.value, { version: item.version, userId });
    });
  },

  /**
   * Removes multiple items from localStorage
   */
  batchRemove(keys: string[], userId?: string): void {
    keys.forEach((key) => this.remove(key, { userId }));
  },

  /**
   * Retrieves multiple items from localStorage
   */
  getMany<T>(keys: string[], userId?: string): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    keys.forEach((key) => {
      result[key] = this.get<T>(key, userId);
    });
    return result;
  },
};
