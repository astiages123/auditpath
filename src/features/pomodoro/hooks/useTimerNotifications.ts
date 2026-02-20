import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { playNotificationSound } from '../logic/audioUtils';
import { logger } from '@/utils/logger';
import faviconSvg from '@/assets/favicon.svg';

interface UseTimerNotificationsProps {
  timeLeft: number;
  isActive: boolean;
  isBreak: boolean;
  sessionId: string | null;
  originalStartTime: number | null;
  startTime: number | null;
}

export function useTimerNotifications({
  timeLeft,
  isActive,
  isBreak,
  sessionId,
  originalStartTime,
  startTime,
}: UseTimerNotificationsProps) {
  const lastNotifiedRef = useRef<string | null>(null);

  useEffect(() => {
    const checkCompletion = () => {
      if (timeLeft <= 0 && isActive) {
        const uniqueSessionKey =
          sessionId ||
          `anonymous-${originalStartTime || startTime || 'unknown'}`;
        const notificationKey = `${uniqueSessionKey}-${
          isBreak ? 'break' : 'work'
        }`;

        // PREVENT DOUBLE FIRE
        if (lastNotifiedRef.current === notificationKey) return;
        lastNotifiedRef.current = notificationKey;

        const message = !isBreak
          ? 'Harika iş çıkardın! Şimdi kısa bir mola zamanı. ☕'
          : 'Mola bitti, tekrar odaklanmaya hazır mısın? 💪';

        // Sonner Toast
        toast.success(message, { duration: 2000 });

        // Notification Tool
        const sendNotification = () => {
          if (
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            try {
              const notification = new Notification('Pomodoro: Süre Doldu!', {
                body: message,
                icon: faviconSvg,
                tag: notificationKey,
                requireInteraction: true,
              });

              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            } catch (e: unknown) {
              logger.error('Desktop Notification failed', e as Error);
            }
          }
        };

        if (Notification.permission === 'granted') {
          sendNotification();
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') sendNotification();
          });
        }

        playNotificationSound();
      }
    };

    checkCompletion();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkCompletion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timeLeft, isActive, isBreak, sessionId, originalStartTime, startTime]);
}
