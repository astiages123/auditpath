import { logger } from '@/utils/logger';

const notificationAudio: HTMLAudioElement | null =
  typeof window !== 'undefined' ? new Audio('/audio/alarmRing.mp3') : null;

/**
 * Plays the notification sound when a timer ends.
 * Catches and logs errors if playback fails due to missing user gesture context.
 */
export const playNotificationSound = (): void => {
  if (!notificationAudio) return;

  notificationAudio.currentTime = 0;
  void notificationAudio.play().catch((playbackError: unknown) => {
    logger.warn(
      'AudioUtils',
      'playNotificationSound',
      'Audio play failed (waiting for user interaction):',
      playbackError
    );
  });
};

/**
 * Browsers block audio in the background unless unlocked by a direct user gesture.
 * Call this function on the first user interaction (e.g. click).
 */
export const unlockAudio = (): void => {
  if (!notificationAudio) return;

  void notificationAudio.play().then(() => {
    notificationAudio.pause();
    notificationAudio.currentTime = 0;
  });
};
