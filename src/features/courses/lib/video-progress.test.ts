import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getVideoProgress,
  isVideoCompleted,
  toggleVideoProgress,
  toggleVideoProgressBatch,
  getCompletedVideoNumbers,
  getCourseStats,
  clearCourseProgress,
  getAllProgressCourses,
} from './video-progress';

const TEST_COURSE_ID = 'test-course-123';
const STORAGE_KEY_PREFIX = 'video-progress-';

let mockStorageData: Record<string, string> = {};

vi.mock('@/shared/lib/core/services/storage.service', () => ({
  storage: {
    get: vi.fn((key: string) => {
      const raw = mockStorageData[key];
      if (!raw) return null;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return raw;
    }),
    set: vi.fn(
      (
        key: string,
        value: { completedVideos: number[]; updatedAt: number }
      ) => {
        mockStorageData[key] = JSON.stringify(value);
      }
    ),
    remove: vi.fn((key: string) => {
      delete mockStorageData[key];
    }),
    getKeys: vi.fn(() => Object.keys(mockStorageData)),
    keys: vi.fn(() => Object.keys(mockStorageData)),
  },
}));

describe('video-progress', () => {
  beforeEach(() => {
    mockStorageData = {};
  });

  describe('getVideoProgress', () => {
    it('should return empty Set when no progress exists', () => {
      const progress = getVideoProgress(TEST_COURSE_ID);
      expect(progress).toBeInstanceOf(Set);
      expect(progress.size).toBe(0);
    });

    it('should return empty Set for non-existent course', () => {
      const progress = getVideoProgress('non-existent-course');
      expect(progress).toBeInstanceOf(Set);
      expect(progress.size).toBe(0);
    });

    it('should load progress from localStorage', () => {
      const storedData = {
        completedVideos: [1, 2, 3],
        updatedAt: Date.now(),
      };
      mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`] =
        JSON.stringify(storedData);

      const progress = getVideoProgress(TEST_COURSE_ID);
      expect(progress.size).toBe(3);
      expect(progress.has(1)).toBe(true);
      expect(progress.has(2)).toBe(true);
      expect(progress.has(3)).toBe(true);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`] =
        'invalid-json-data';

      const progress = getVideoProgress(TEST_COURSE_ID);
      expect(progress).toBeInstanceOf(Set);
      expect(progress.size).toBe(0);
    });

    it('should handle missing completedVideos array', () => {
      const storedData = { updatedAt: Date.now() };
      mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`] =
        JSON.stringify(storedData);

      const progress = getVideoProgress(TEST_COURSE_ID);
      expect(progress).toBeInstanceOf(Set);
    });
  });

  describe('isVideoCompleted', () => {
    it('should return false when video is not completed', () => {
      const isCompleted = isVideoCompleted(TEST_COURSE_ID, 1);
      expect(isCompleted).toBe(false);
    });

    it('should return true when video is completed', () => {
      const storedData = {
        completedVideos: [1, 2, 3],
        updatedAt: Date.now(),
      };
      mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`] =
        JSON.stringify(storedData);

      expect(isVideoCompleted(TEST_COURSE_ID, 1)).toBe(true);
      expect(isVideoCompleted(TEST_COURSE_ID, 2)).toBe(true);
      expect(isVideoCompleted(TEST_COURSE_ID, 3)).toBe(true);
    });

    it('should return false for non-existent video', () => {
      const storedData = {
        completedVideos: [1, 2],
        updatedAt: Date.now(),
      };
      mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`] =
        JSON.stringify(storedData);

      expect(isVideoCompleted(TEST_COURSE_ID, 99)).toBe(false);
    });
  });

  describe('toggleVideoProgress', () => {
    it('should add video when completed is true', () => {
      const result = toggleVideoProgress(TEST_COURSE_ID, 1, true);

      expect(result).toBeInstanceOf(Set);
      expect(result.has(1)).toBe(true);
      expect(result.size).toBe(1);
    });

    it('should remove video when completed is false', () => {
      // Önce ekle
      toggleVideoProgress(TEST_COURSE_ID, 1, true);

      // Sonra çıkar
      const result = toggleVideoProgress(TEST_COURSE_ID, 1, false);

      expect(result.has(1)).toBe(false);
      expect(result.size).toBe(0);
    });

    it('should not duplicate video when adding existing video', () => {
      toggleVideoProgress(TEST_COURSE_ID, 1, true);
      toggleVideoProgress(TEST_COURSE_ID, 1, true);

      const progress = getVideoProgress(TEST_COURSE_ID);
      expect(progress.size).toBe(1);
    });

    it('should handle toggle (add and remove) correctly', () => {
      // Ekle
      toggleVideoProgress(TEST_COURSE_ID, 1, true);
      expect(isVideoCompleted(TEST_COURSE_ID, 1)).toBe(true);

      // Çıkar
      toggleVideoProgress(TEST_COURSE_ID, 1, false);
      expect(isVideoCompleted(TEST_COURSE_ID, 1)).toBe(false);

      // Tekrar ekle
      toggleVideoProgress(TEST_COURSE_ID, 1, true);
      expect(isVideoCompleted(TEST_COURSE_ID, 1)).toBe(true);
    });

    it('should save to localStorage with correct format', () => {
      const beforeTime = Date.now();
      toggleVideoProgress(TEST_COURSE_ID, 1, true);
      const afterTime = Date.now();

      const stored = mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`];
      expect(stored).not.toBeUndefined();

      const data = JSON.parse(stored);
      expect(data.completedVideos).toEqual([1]);
      expect(data.updatedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(data.updatedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should handle multiple videos independently', () => {
      toggleVideoProgress(TEST_COURSE_ID, 1, true);
      toggleVideoProgress(TEST_COURSE_ID, 2, true);
      toggleVideoProgress(TEST_COURSE_ID, 3, true);

      const progress = getVideoProgress(TEST_COURSE_ID);
      expect(progress.size).toBe(3);
      expect(progress.has(1)).toBe(true);
      expect(progress.has(2)).toBe(true);
      expect(progress.has(3)).toBe(true);
    });

    it('should update localStorage timestamp on each change', async () => {
      toggleVideoProgress(TEST_COURSE_ID, 1, true);
      const firstData = JSON.parse(
        mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`]
      );
      const firstTimestamp = firstData.updatedAt;

      // Bekle ve tekrar güncelle
      await new Promise((resolve) => setTimeout(resolve, 10));
      toggleVideoProgress(TEST_COURSE_ID, 2, true);
      const secondData = JSON.parse(
        mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`]
      );
      expect(secondData.updatedAt).toBeGreaterThanOrEqual(firstTimestamp);
    });
  });

  describe('toggleVideoProgressBatch', () => {
    it('should add multiple videos at once', () => {
      const result = toggleVideoProgressBatch(TEST_COURSE_ID, [1, 2, 3], true);

      expect(result.size).toBe(3);
      expect(result.has(1)).toBe(true);
      expect(result.has(2)).toBe(true);
      expect(result.has(3)).toBe(true);
    });

    it('should remove multiple videos at once', () => {
      // Önce ekle
      toggleVideoProgressBatch(TEST_COURSE_ID, [1, 2, 3, 4, 5], true);

      // Sonra kısmen çıkar
      const result = toggleVideoProgressBatch(TEST_COURSE_ID, [2, 4], false);

      expect(result.size).toBe(3);
      expect(result.has(1)).toBe(true);
      expect(result.has(2)).toBe(false);
      expect(result.has(3)).toBe(true);
      expect(result.has(4)).toBe(false);
      expect(result.has(5)).toBe(true);
    });

    it('should handle empty array', () => {
      const result = toggleVideoProgressBatch(TEST_COURSE_ID, [], true);
      expect(result.size).toBe(0);
    });

    it('should handle single video array', () => {
      const result = toggleVideoProgressBatch(TEST_COURSE_ID, [1], true);
      expect(result.size).toBe(1);
      expect(result.has(1)).toBe(true);
    });

    it('should not duplicate when adding existing videos', () => {
      toggleVideoProgress(TEST_COURSE_ID, 1, true);
      toggleVideoProgressBatch(TEST_COURSE_ID, [1, 2, 3], true);

      const progress = getVideoProgress(TEST_COURSE_ID);
      expect(progress.size).toBe(3);
    });

    it('should save batch operation to localStorage', () => {
      toggleVideoProgressBatch(TEST_COURSE_ID, [1, 2, 3], true);

      const stored = mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`];
      expect(stored).not.toBeUndefined();

      const data = JSON.parse(stored);
      expect(data.completedVideos).toContain(1);
      expect(data.completedVideos).toContain(2);
      expect(data.completedVideos).toContain(3);
      expect(data.completedVideos).toHaveLength(3);
      expect(data.updatedAt).toBeDefined();
    });

    it('should handle mixed add and remove operations separately', () => {
      toggleVideoProgressBatch(TEST_COURSE_ID, [1, 2, 3, 4, 5], true);
      toggleVideoProgressBatch(TEST_COURSE_ID, [2, 3], false);

      const progress = getVideoProgress(TEST_COURSE_ID);
      expect(progress.has(1)).toBe(true);
      expect(progress.has(2)).toBe(false);
      expect(progress.has(3)).toBe(false);
      expect(progress.has(4)).toBe(true);
      expect(progress.has(5)).toBe(true);
    });
  });

  describe('getCompletedVideoNumbers', () => {
    it('should return empty array when no progress', () => {
      const videos = getCompletedVideoNumbers(TEST_COURSE_ID);
      expect(videos).toEqual([]);
    });

    it('should return sorted array of completed videos', () => {
      toggleVideoProgressBatch(TEST_COURSE_ID, [5, 1, 3, 2, 4], true);

      const videos = getCompletedVideoNumbers(TEST_COURSE_ID);
      expect(videos).toEqual([1, 2, 3, 4, 5]);
    });

    it('should return single video as array', () => {
      toggleVideoProgress(TEST_COURSE_ID, 42, true);

      const videos = getCompletedVideoNumbers(TEST_COURSE_ID);
      expect(videos).toEqual([42]);
    });

    it('should update after removing videos', () => {
      toggleVideoProgressBatch(TEST_COURSE_ID, [1, 2, 3], true);
      toggleVideoProgress(TEST_COURSE_ID, 2, false);

      const videos = getCompletedVideoNumbers(TEST_COURSE_ID);
      expect(videos).toEqual([1, 3]);
    });
  });

  describe('getCourseStats', () => {
    it('should return zero stats when no progress', () => {
      const stats = getCourseStats(TEST_COURSE_ID, 10);

      expect(stats.completedCount).toBe(0);
      expect(stats.totalVideos).toBe(10);
      expect(stats.percentage).toBe(0);
    });

    it('should calculate percentage correctly', () => {
      toggleVideoProgressBatch(TEST_COURSE_ID, [1, 2, 3], true);

      const stats = getCourseStats(TEST_COURSE_ID, 10);
      expect(stats.completedCount).toBe(3);
      expect(stats.totalVideos).toBe(10);
      expect(stats.percentage).toBe(30);
    });

    it('should return 0 percentage when totalVideos is 0', () => {
      toggleVideoProgress(TEST_COURSE_ID, 1, true);

      const stats = getCourseStats(TEST_COURSE_ID, 0);
      expect(stats.completedCount).toBe(1);
      expect(stats.totalVideos).toBe(0);
      expect(stats.percentage).toBe(0);
    });

    it('should return 100 percentage when all videos completed', () => {
      toggleVideoProgressBatch(TEST_COURSE_ID, [1, 2, 3, 4, 5], true);

      const stats = getCourseStats(TEST_COURSE_ID, 5);
      expect(stats.percentage).toBe(100);
    });

    it('should round percentage to nearest integer', () => {
      toggleVideoProgressBatch(TEST_COURSE_ID, [1, 2, 3], true);

      const stats = getCourseStats(TEST_COURSE_ID, 7);
      // 3/7 = 0.42857... -> rounds to 43%
      expect(stats.percentage).toBe(43);
    });

    it('should update stats after removing videos', () => {
      toggleVideoProgressBatch(TEST_COURSE_ID, [1, 2, 3, 4, 5], true);

      let stats = getCourseStats(TEST_COURSE_ID, 10);
      expect(stats.percentage).toBe(50);

      toggleVideoProgress(TEST_COURSE_ID, 5, false);

      stats = getCourseStats(TEST_COURSE_ID, 10);
      expect(stats.percentage).toBe(40);
    });
  });

  describe('clearCourseProgress', () => {
    it('should remove progress from localStorage', () => {
      toggleVideoProgress(TEST_COURSE_ID, 1, true);
      expect(
        mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`]
      ).not.toBeUndefined();

      clearCourseProgress(TEST_COURSE_ID);
      expect(
        mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`]
      ).toBeUndefined();
    });

    it('should handle clearing non-existent course', () => {
      expect(() => {
        clearCourseProgress('non-existent-course');
      }).not.toThrow();
    });

    it('should reset progress to empty Set', () => {
      toggleVideoProgressBatch(TEST_COURSE_ID, [1, 2, 3], true);
      clearCourseProgress(TEST_COURSE_ID);

      const progress = getVideoProgress(TEST_COURSE_ID);
      expect(progress.size).toBe(0);
    });
  });

  describe('getAllProgressCourses', () => {
    it('should return empty array when no courses have progress', () => {
      const courses = getAllProgressCourses();
      expect(courses).toEqual([]);
    });

    it('should return all course IDs with progress', () => {
      toggleVideoProgress('course-a', 1, true);
      toggleVideoProgress('course-b', 1, true);
      toggleVideoProgress('course-c', 1, true);

      const courses = getAllProgressCourses();
      expect(courses).toHaveLength(3);
      expect(courses).toContain('course-a');
      expect(courses).toContain('course-b');
      expect(courses).toContain('course-c');
    });

    it('should ignore non-progress localStorage keys', () => {
      mockStorageData['some-other-key'] = 'value';
      mockStorageData['user-preferences'] = '{}';
      toggleVideoProgress(TEST_COURSE_ID, 1, true);

      const courses = getAllProgressCourses();
      expect(courses).toHaveLength(1);
      expect(courses).toContain(TEST_COURSE_ID);
    });

    it('should handle multiple courses independently', () => {
      toggleVideoProgress('course-1', 1, true);
      toggleVideoProgress('course-1', 2, true);
      toggleVideoProgress('course-2', 5, true);

      const courses = getAllProgressCourses();
      expect(courses).toHaveLength(2);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete course workflow', () => {
      // Kursa video ekle
      toggleVideoProgress(TEST_COURSE_ID, 1, true);
      toggleVideoProgress(TEST_COURSE_ID, 2, true);
      toggleVideoProgress(TEST_COURSE_ID, 3, true);

      // İstatistikleri kontrol et
      let stats = getCourseStats(TEST_COURSE_ID, 5);
      expect(stats.percentage).toBe(60);

      // Bir videoyu geri al
      toggleVideoProgress(TEST_COURSE_ID, 2, false);

      // Tekrar kontrol et
      stats = getCourseStats(TEST_COURSE_ID, 5);
      expect(stats.percentage).toBe(40);
      expect(isVideoCompleted(TEST_COURSE_ID, 2)).toBe(false);

      // Tamamla
      toggleVideoProgressBatch(TEST_COURSE_ID, [2, 4, 5], true);
      stats = getCourseStats(TEST_COURSE_ID, 5);
      expect(stats.percentage).toBe(100);
    });

    it('should persist data across multiple sessions (simulated)', () => {
      // İlk oturum
      toggleVideoProgress(TEST_COURSE_ID, 1, true);
      const storedData =
        mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`];

      // localStorage'ı temizle (yeni oturum simülasyonu)
      mockStorageData = {};
      mockStorageData[`${STORAGE_KEY_PREFIX}${TEST_COURSE_ID}`] = storedData;

      // Yeni oturumda veriyi oku
      const progress = getVideoProgress(TEST_COURSE_ID);
      expect(progress.has(1)).toBe(true);
    });

    it('should handle multiple courses independently', () => {
      const courseA = 'course-a';
      const courseB = 'course-b';

      toggleVideoProgress(courseA, 1, true);
      toggleVideoProgress(courseA, 2, true);
      toggleVideoProgress(courseB, 5, true);

      const progressA = getVideoProgress(courseA);
      const progressB = getVideoProgress(courseB);

      expect(progressA.size).toBe(2);
      expect(progressB.size).toBe(1);
      expect(progressA.has(1)).toBe(true);
      expect(progressB.has(5)).toBe(true);
      expect(progressA.has(5)).toBe(false);
    });
  });
});
