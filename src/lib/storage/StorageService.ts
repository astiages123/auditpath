/**
 * Storage Service
 *
 * Centralized localStorage management with type safety,
 * error handling, and XSS protection.
 */

import { logger } from "../../utils/logger";
import { deepSanitize } from "@/shared/utils/sanitizers/stateSanitizer";

const storageLogger = logger.withPrefix("[StorageService]");

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

const DEFAULT_PREFIX = "auditpath_";
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Safely parses JSON with error handling
 */
function safeParse<T>(json: string | null): T | null {
    if (!json) return null;

    try {
        return JSON.parse(json) as T;
    } catch (error) {
        storageLogger.warn("Failed to parse JSON from localStorage", { error });
        return null;
    }
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
            if (
                this.defaultTtl &&
                Date.now() - parsed.timestamp > this.defaultTtl
            ) {
                this.remove(key);
                return null;
            }

            // Sanitize the value before returning
            return deepSanitize(parsed.value);
        } catch (error) {
            storageLogger.error("Failed to get item from localStorage", {
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
            storageLogger.error("Failed to get raw item from localStorage", {
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
        options?: { ttl?: number; version?: string },
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
            storageLogger.error("Failed to set item in localStorage", {
                key,
                error,
            });

            // Handle quota exceeded error
            if (error instanceof Error && error.name === "QuotaExceededError") {
                this.cleanup();
                // Retry once
                try {
                    localStorage.setItem(
                        this.getKey(key),
                        JSON.stringify({
                            value,
                            timestamp: Date.now(),
                            version: options?.version,
                        }),
                    );
                } catch (retryError) {
                    storageLogger.error("Retry failed after cleanup", {
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
            storageLogger.error("Failed to remove item from localStorage", {
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
            storageLogger.error("Failed to clear localStorage", { error });
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
            storageLogger.error("Failed to get keys from localStorage", {
                error,
            });
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
                        localStorage.getItem(key),
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
            storageLogger.info(
                `Cleaned up ${keysToRemove.length} expired items`,
            );
        } catch (error) {
            storageLogger.error("Failed to cleanup localStorage", { error });
        }
    }
}
