/**
 * Storage Module
 *
 * Barrel export for the storage service and sanitization logic.
 */

import { StorageOptions, StorageService } from "./StorageService";
import { ContentType, deepSanitize, sanitizeString } from "./sanitizer";

// Export types
export type { ContentType, StorageOptions };
export { deepSanitize, sanitizeString };

// Export singleton instance
export const storage = new StorageService();

/**
 * Convenience functions mapping to the singleton instance
 */
export const getStorageItem = <T>(key: string): T | null => storage.get<T>(key);

export const setStorageItem = <T>(
    key: string,
    value: T,
    options?: { ttl?: number; version?: string },
): void => storage.set(key, value, options);

export const removeStorageItem = (key: string): void => storage.remove(key);

export const clearStorage = (): void => storage.clear();

export const hasStorageItem = (key: string): boolean => storage.has(key);

export { StorageService };
