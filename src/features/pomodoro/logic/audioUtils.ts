import { logger } from '@/utils/logger';

const notificationAudio =
  typeof window !== 'undefined' ? new Audio('/audio/alarmRing.mp3') : null;

export const playNotificationSound = () => {
  if (!notificationAudio) return;
  try {
    notificationAudio.currentTime = 0;
    notificationAudio.play().catch((e) => {
      logger.warn('Audio play failed (waiting for user interaction):', e);
    });
  } catch (e) {
    logger.error('Audio initialization failed', e as Error);
  }
};

/**
 * Browsers block audio in background unless unlocked by a user gesture.
 */
export const unlockAudio = () => {
  if (!notificationAudio) return;
  notificationAudio
    .play()
    .then(() => {
      notificationAudio.pause();
      notificationAudio.currentTime = 0;
    })
    .catch(() => {
      // Safe to ignore, we are just warming it up
    });
};
