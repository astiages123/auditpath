import { logger } from '@/utils/logger';

// ===========================
// === AUDIO INITIALIZATION ===
// ===========================

const notificationAudio: HTMLAudioElement | null =
  typeof window !== 'undefined' ? new Audio('/audio/alarmRing.mp3') : null;

// ===========================
// === AUDIO PLAYBACK LOGIC ===
// ===========================

/**
 * Plays the notification sound when a timer ends.
 * Catches and logs errors if playback fails due to missing user gesture context.
 */
export const playNotificationSound = (): void => {
  if (!notificationAudio) return;
  try {
    notificationAudio.currentTime = 0;
    notificationAudio.play().catch((error: unknown) => {
      console.error('[audioUtils][playNotificationSound] Hata:', error);
      logger.warn(
        'AudioUtils',
        'playNotificationSound',
        'Audio play failed (waiting for user interaction):',
        error
      );
    });
  } catch (error: unknown) {
    console.error('[audioUtils][playNotificationSound] Hata:', error);
    logger.error(
      'AudioUtils',
      'playNotificationSound',
      'Audio initialization failed',
      error as Error
    );
  }
};

/**
 * Browsers block audio in the background unless unlocked by a direct user gesture.
 * Call this function on the first user interaction (e.g. click).
 */
export const unlockAudio = (): void => {
  if (!notificationAudio) return;
  notificationAudio
    .play()
    .then(() => {
      notificationAudio.pause();
      notificationAudio.currentTime = 0;
    })
    .catch((error: unknown) => {
      // Safe to ignore, we are just warming it up for future background plays
      console.error(
        '[audioUtils][unlockAudio] Hata: warming up audio failed (safe to ignore)',
        error
      );
    });
};
