/**
 * Offline Queue Service
 *
 * Manages a queue of operations to be synced when connection is restored.
 * Used primarily for quiz progress tracking when the user is offline.
 */

import { storage } from "@/shared/services/storageService";
import { logger } from "@/utils/logger";

const QUEUE_KEY = "offline_quiz_queue";
const MAX_QUEUE_SIZE = 100;

export interface QueuedQuizProgress {
  id: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

/**
 * Adds a quiz progress item to the offline queue
 */
export function addToOfflineQueue(payload: Record<string, unknown>): void {
  try {
    const queue = getOfflineQueue();

    // Prevent duplicates by checking question_id
    const existingIndex = queue.findIndex(
      (item) => item.payload.question_id === payload.question_id,
    );

    if (existingIndex !== -1) {
      // Update existing entry with latest data
      queue[existingIndex] = {
        id: generateId(),
        payload,
        timestamp: Date.now(),
        retryCount: 0,
      };
    } else {
      // Add new entry
      queue.push({
        id: generateId(),
        payload,
        timestamp: Date.now(),
        retryCount: 0,
      });
    }

    // Limit queue size (FIFO)
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.shift();
      logger.warn("Offline queue exceeded max size, removed oldest entry");
    }

    storage.set(QUEUE_KEY, queue, { ttl: 7 * 24 * 60 * 60 * 1000 }); // 7 days
  } catch (error) {
    logger.error("Failed to add to offline queue", error as Error);
  }
}

/**
 * Gets all items from the offline queue
 */
export function getOfflineQueue(): QueuedQuizProgress[] {
  return storage.get<QueuedQuizProgress[]>(QUEUE_KEY) || [];
}

/**
 * Removes an item from the offline queue by ID
 */
export function removeFromOfflineQueue(id: string): void {
  try {
    const queue = getOfflineQueue().filter((item) => item.id !== id);
    storage.set(QUEUE_KEY, queue, { ttl: 7 * 24 * 60 * 60 * 1000 });
  } catch (error) {
    logger.error("Failed to remove from offline queue", error as Error);
  }
}

/**
 * Clears all items from the offline queue
 */
export function clearOfflineQueue(): void {
  storage.remove(QUEUE_KEY);
}

/**
 * Updates retry count for a queued item
 */
export function incrementRetryCount(id: string): void {
  try {
    const queue = getOfflineQueue().map((item) => {
      if (item.id === id) {
        return { ...item, retryCount: item.retryCount + 1 };
      }
      return item;
    });
    storage.set(QUEUE_KEY, queue, { ttl: 7 * 24 * 60 * 60 * 1000 });
  } catch (error) {
    logger.error("Failed to increment retry count", error as Error);
  }
}

/**
 * Checks if there are items pending in the queue
 */
export function hasPendingOfflineItems(): boolean {
  return getOfflineQueue().length > 0;
}

/**
 * Gets the count of pending items
 */
export function getPendingCount(): number {
  return getOfflineQueue().length;
}

/**
 * Syncs all queued items with the server
 * Returns results of each sync attempt
 */
export interface SyncResult {
  id: string;
  success: boolean;
  error?: string;
}

export async function syncOfflineQueue(
  syncFn: (
    payload: Record<string, unknown>,
  ) => Promise<{ success: boolean; error?: Error }>,
): Promise<SyncResult[]> {
  const queue = getOfflineQueue();
  const results: SyncResult[] = [];

  for (const item of queue) {
    try {
      const result = await syncFn(item.payload);

      if (result.success) {
        removeFromOfflineQueue(item.id);
        results.push({ id: item.id, success: true });
      } else {
        incrementRetryCount(item.id);
        results.push({
          id: item.id,
          success: false,
          error: result.error?.message,
        });

        // Remove items that have been retried too many times
        if (item.retryCount >= 5) {
          logger.warn(`Removing queue item ${item.id} after 5 failed retries`);
          removeFromOfflineQueue(item.id);
        }
      }
    } catch (error) {
      incrementRetryCount(item.id);
      results.push({
        id: item.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
