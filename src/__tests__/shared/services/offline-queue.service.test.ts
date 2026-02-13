import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  addToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
  syncOfflineQueue,
  getPendingCount,
  hasPendingOfflineItems,
  incrementRetryCount,
} from '@/shared/lib/core/services/offline-queue.service';
import { storage } from '@/shared/lib/core/services/storage.service';

vi.mock('@/shared/lib/core/services/storage.service', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('OfflineQueue Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (storage.get as ReturnType<typeof vi.fn>).mockReturnValue([]);
  });

  describe('addToOfflineQueue', () => {
    it('should add new item to empty queue', () => {
      const payload = { question_id: 'q1', status: 'correct' };

      addToOfflineQueue(payload);

      expect(storage.set).toHaveBeenCalledWith(
        'offline_quiz_queue',
        expect.arrayContaining([
          expect.objectContaining({
            payload,
            retryCount: 0,
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should update existing item with same question_id', () => {
      const existingQueue = [
        {
          id: 'existing-id',
          payload: { question_id: 'q1', status: 'incorrect' },
          timestamp: Date.now() - 1000,
          retryCount: 0,
        },
      ];
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue(existingQueue);

      const payload = { question_id: 'q1', status: 'correct' };
      addToOfflineQueue(payload);

      expect(storage.set).toHaveBeenCalledWith(
        'offline_quiz_queue',
        expect.arrayContaining([
          expect.objectContaining({
            payload,
            retryCount: 0,
          }),
        ]),
        expect.any(Object)
      );
    });
  });

  describe('getOfflineQueue', () => {
    it('should return empty array when no queue exists', () => {
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const queue = getOfflineQueue();

      expect(queue).toEqual([]);
    });

    it('should return queue from storage', () => {
      const queue = [{ id: '1', payload: {}, timestamp: 1, retryCount: 0 }];
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue(queue);

      const result = getOfflineQueue();

      expect(result).toEqual(queue);
    });
  });

  describe('removeFromOfflineQueue', () => {
    it('should remove item by id', () => {
      const queue = [
        { id: 'id-1', payload: {}, timestamp: 1, retryCount: 0 },
        { id: 'id-2', payload: {}, timestamp: 2, retryCount: 0 },
      ];
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue(queue);

      removeFromOfflineQueue('id-1');

      expect(storage.set).toHaveBeenCalledWith(
        'offline_quiz_queue',
        expect.arrayContaining([expect.objectContaining({ id: 'id-2' })]),
        expect.any(Object)
      );
    });
  });

  describe('clearOfflineQueue', () => {
    it('should clear all items from queue', () => {
      const queue = [{ id: 'id-1', payload: {}, timestamp: 1, retryCount: 0 }];
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue(queue);

      clearOfflineQueue();

      expect(storage.remove).toHaveBeenCalledWith('offline_quiz_queue');
    });
  });

  describe('hasPendingOfflineItems', () => {
    it('should return false for empty queue', () => {
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const result = hasPendingOfflineItems();

      expect(result).toBe(false);
    });

    it('should return true when queue has items', () => {
      const queue = [{ id: '1', payload: {}, timestamp: 1, retryCount: 0 }];
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue(queue);

      const result = hasPendingOfflineItems();

      expect(result).toBe(true);
    });
  });

  describe('getPendingCount', () => {
    it('should return 0 for empty queue', () => {
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const count = getPendingCount();

      expect(count).toBe(0);
    });

    it('should return correct count', () => {
      const queue = [
        { id: '1', payload: {}, timestamp: 1, retryCount: 0 },
        { id: '2', payload: {}, timestamp: 2, retryCount: 0 },
      ];
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue(queue);

      const count = getPendingCount();

      expect(count).toBe(2);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count for specific item', () => {
      const queue = [{ id: 'id-1', payload: {}, timestamp: 1, retryCount: 0 }];
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue(queue);

      incrementRetryCount('id-1');

      expect(storage.set).toHaveBeenCalledWith(
        'offline_quiz_queue',
        expect.arrayContaining([
          expect.objectContaining({ id: 'id-1', retryCount: 1 }),
        ]),
        expect.any(Object)
      );
    });
  });

  describe('syncOfflineQueue', () => {
    it('should sync all items and remove successful ones', async () => {
      const queue = [
        {
          id: 'id-1',
          payload: { question_id: 'q1' },
          timestamp: 1,
          retryCount: 0,
        },
        {
          id: 'id-2',
          payload: { question_id: 'q2' },
          timestamp: 2,
          retryCount: 0,
        },
      ];
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue(queue);

      const syncFn = vi
        .fn()
        .mockImplementation(async () => ({ success: true }));

      const results = await syncOfflineQueue(syncFn);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should increment retry count on failure', async () => {
      const queue = [
        {
          id: 'id-1',
          payload: { question_id: 'q1' },
          timestamp: 1,
          retryCount: 0,
        },
      ];
      (storage.get as ReturnType<typeof vi.fn>).mockReturnValue(queue);

      const syncFn = vi.fn().mockImplementation(async () => ({
        success: false,
        error: new Error('fail'),
      }));

      await syncOfflineQueue(syncFn);

      expect(storage.set).toHaveBeenCalledWith(
        'offline_quiz_queue',
        expect.arrayContaining([
          expect.objectContaining({ id: 'id-1', retryCount: 1 }),
        ]),
        expect.any(Object)
      );
    });
  });
});
