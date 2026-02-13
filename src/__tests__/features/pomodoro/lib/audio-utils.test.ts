import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the logger module
vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    withPrefix: vi.fn(() => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

// Import the mocked logger after vi.mock
import { logger } from '@/shared/lib/core/utils/logger';

describe('audio-utils.ts', () => {
  let mockAudioInstance: {
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    currentTime: number;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Create mock audio instance
    mockAudioInstance = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      currentTime: 0,
    };

    // Create a proper class constructor for Audio
    // Using a class expression that returns the mock instance
    const MockAudio = class {
      constructor(_src: string) {
        return mockAudioInstance;
      }
    };
    vi.stubGlobal('Audio', MockAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('playNotificationSound', () => {
    it('should reset currentTime to 0 before playing', async () => {
      // Set initial currentTime to something other than 0
      mockAudioInstance.currentTime = 5;

      // Import after stubbing
      const { playNotificationSound } =
        await import('@/features/pomodoro/lib/audio-utils');

      playNotificationSound();

      expect(mockAudioInstance.currentTime).toBe(0);
    });

    it('should call play() method', async () => {
      const { playNotificationSound } =
        await import('@/features/pomodoro/lib/audio-utils');

      playNotificationSound();

      expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
    });

    it('should handle play() rejection gracefully', async () => {
      const playError = new Error('Audio play failed');
      mockAudioInstance.play = vi.fn().mockRejectedValue(playError);

      const { playNotificationSound } =
        await import('@/features/pomodoro/lib/audio-utils');

      // Should not throw
      expect(() => playNotificationSound()).not.toThrow();
    });

    it('should log warning when play() fails', async () => {
      const playError = new Error('Audio play failed');
      mockAudioInstance.play = vi.fn().mockRejectedValue(playError);

      const { playNotificationSound } =
        await import('@/features/pomodoro/lib/audio-utils');

      playNotificationSound();

      // Wait for microtask queue to process the promise rejection
      await vi.waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          'Audio play failed (waiting for user interaction):',
          playError
        );
      });
    });

    it('should handle play() throwing synchronously', async () => {
      // Mock play() to throw synchronously (not return rejected promise)
      mockAudioInstance.play = vi.fn().mockImplementation(() => {
        throw new Error('Sync play error');
      });

      const { playNotificationSound } =
        await import('@/features/pomodoro/lib/audio-utils');

      // Should not throw - the error is caught in try-catch
      expect(() => playNotificationSound()).not.toThrow();
    });

    it('should do nothing when notificationAudio is null (SSR)', async () => {
      // Remove window to simulate SSR
      const originalWindow = globalThis.window;
      // @ts-expect-error - intentionally removing window for SSR test
      delete globalThis.window;

      // Re-import to get the SSR version
      const { playNotificationSound } =
        await import('@/features/pomodoro/lib/audio-utils');

      // Should not throw and should not call play
      expect(() => playNotificationSound()).not.toThrow();

      // Restore window
      globalThis.window = originalWindow;
    });
  });

  describe('unlockAudio', () => {
    it('should call play() then pause() to unlock audio', async () => {
      const { unlockAudio } =
        await import('@/features/pomodoro/lib/audio-utils');

      unlockAudio();

      // Wait for the promise chain
      await vi.waitFor(() => {
        expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
        expect(mockAudioInstance.pause).toHaveBeenCalledTimes(1);
      });
    });

    it('should reset currentTime to 0 after unlocking', async () => {
      mockAudioInstance.currentTime = 10;

      const { unlockAudio } =
        await import('@/features/pomodoro/lib/audio-utils');

      unlockAudio();

      // Wait for the promise chain
      await vi.waitFor(() => {
        expect(mockAudioInstance.currentTime).toBe(0);
      });
    });

    it('should silently handle play() rejection during unlock', async () => {
      mockAudioInstance.play = vi
        .fn()
        .mockRejectedValue(new Error('Not allowed'));

      const { unlockAudio } =
        await import('@/features/pomodoro/lib/audio-utils');

      // Should not throw
      expect(() => unlockAudio()).not.toThrow();
    });

    it('should not log anything when unlock fails (expected behavior)', async () => {
      mockAudioInstance.play = vi
        .fn()
        .mockRejectedValue(new Error('Not allowed'));

      const { unlockAudio } =
        await import('@/features/pomodoro/lib/audio-utils');

      unlockAudio();

      // Wait a bit for the promise to settle
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not log error or warning for unlock failures
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should do nothing when notificationAudio is null (SSR)', async () => {
      // Remove window to simulate SSR
      const originalWindow = globalThis.window;
      // @ts-expect-error - intentionally removing window for SSR test
      delete globalThis.window;

      const { unlockAudio } =
        await import('@/features/pomodoro/lib/audio-utils');

      // Should not throw
      expect(() => unlockAudio()).not.toThrow();

      // Restore window
      globalThis.window = originalWindow;
    });
  });

  describe('Audio instance creation', () => {
    it('should create Audio instance with correct source path', async () => {
      let capturedSrc: string | undefined;

      const CapturingAudio = class {
        constructor(src: string) {
          capturedSrc = src;
          return mockAudioInstance;
        }
      };
      vi.stubGlobal('Audio', CapturingAudio);

      // Import to trigger module initialization
      await import('@/features/pomodoro/lib/audio-utils');

      expect(capturedSrc).toBe('/audio/alarm_ring.mp3');
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple rapid playNotificationSound calls', async () => {
      const { playNotificationSound } =
        await import('@/features/pomodoro/lib/audio-utils');

      // Call multiple times rapidly
      playNotificationSound();
      playNotificationSound();
      playNotificationSound();

      // Each call should reset currentTime and call play
      expect(mockAudioInstance.play).toHaveBeenCalledTimes(3);
    });

    it('should handle unlock being called before playNotificationSound', async () => {
      const { unlockAudio, playNotificationSound } =
        await import('@/features/pomodoro/lib/audio-utils');

      unlockAudio();
      playNotificationSound();

      await vi.waitFor(() => {
        expect(mockAudioInstance.play).toHaveBeenCalledTimes(2);
      });
    });
  });
});
