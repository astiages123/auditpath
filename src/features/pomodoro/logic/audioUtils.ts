import { logger } from '@/utils/logger';

let notificationAudio: HTMLAudioElement | null = null;

const getAudio = () => {
  if (typeof window === 'undefined') return null;
  if (!notificationAudio) {
    notificationAudio = new Audio('/audio/alarmRing.mp3');
    notificationAudio.preload = 'none'; // Sadece çalınacağı zaman yüklenmeye başlasın
  }
  return notificationAudio;
};

/**
 * Plays the notification sound when a timer ends.
 * Catches and logs errors if playback fails due to missing user gesture context.
 */
export const playNotificationSound = (): void => {
  const audio = getAudio();
  if (!audio) return;

  audio.currentTime = 0;
  void audio.play().catch((playbackError: unknown) => {
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
  const audio = getAudio();
  if (!audio) return;

  void audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
  });
};
