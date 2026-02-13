import { useCallback, useEffect, useRef } from 'react'; // useRef ve useEffect eklendi
import { useTimerStore } from '@/shared/store/use-timer-store';
import {
  deletePomodoroSession,
  getDailySessionCount,
  upsertPomodoroSession,
} from '@/shared/lib/core/client-db';
import { useAuth } from '@/features/auth';
import { unlockAudio } from '../lib/audio-utils';
import { logger } from '@/shared/lib/core/utils/logger';

export type PomodoroMode = 'work' | 'break';

export function usePomodoro() {
  const {
    timeLeft,
    isActive,
    isBreak,
    startTime,
    getPauseDuration,
    selectedCourse,
    startTimer,
    pauseTimer,
    resetTimer,
    setMode,
    setCourse,
    duration,
    isWidgetOpen,
    setWidgetOpen,
    sessionCount,
    incrementSession,
    sessionId,
    setSessionId,
    timeline,
    setSessionCount,
    setHasRestored,
    originalStartTime,
    pauseStartTime,
    tick, // tick fonksiyonu eklendi
  } = useTimerStore();

  const { user } = useAuth();
  const userId = user?.id;

  // --- 1. WORKER KURULUMU VE YÖNETİMİ ---
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Worker'ı başlatıyoruz (Vite URL yapısı)
    workerRef.current = new Worker(
      new URL('../../../workers/timer-worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Worker'dan gelen 'TICK' mesajlarını dinle
    workerRef.current.onmessage = (e) => {
      if (e.data === 'TICK') {
        tick(); // Store'daki zaman azaltma lojiğini tetikle
      }
    };

    // Component kapandığında worker'ı sonlandır (Memory leak önleme)
    return () => {
      workerRef.current?.terminate();
    };
  }, [tick]);

  // --- 2. GÜNCELLENMİŞ HANDLE START ---
  const handleStart = async () => {
    if (!selectedCourse) return;

    const now = Date.now();
    let currentSessionId = sessionId;

    // Session ID oluşturma ve Başlangıç Sayacı
    if (!currentSessionId) {
      if (userId) {
        getDailySessionCount(userId).then((count) =>
          setSessionCount(count + 1)
        );
      }
      currentSessionId = crypto.randomUUID();
      setSessionId(currentSessionId);
    }

    // Veritabanı Kaydı (First Insert Strategy)
    if (userId && currentSessionId && selectedCourse) {
      try {
        await upsertPomodoroSession(
          {
            id: currentSessionId,
            courseId: selectedCourse.id,
            courseName: selectedCourse.name,
            timeline:
              timeline.length > 0 ? timeline : [{ type: 'work', start: now }],
            startedAt: originalStartTime || now,
            isCompleted: false,
          },
          userId
        );
      } catch (error) {
        logger.error('Failed to initialize session in DB:', error as Error);
      }
    }

    // Bildirim İzni
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // Audio ve Worker Başlatma
    unlockAudio();

    // KRİTİK: Testin beklediği Worker mesajı ve Store tetikleyicisi
    workerRef.current?.postMessage('START');
    startTimer();
  };

  // --- 3. DİĞER YARDIMCI FONKSİYONLAR ---
  const getDisplayTime = () => {
    const isOvertime = timeLeft < 0;
    const totalSeconds = isOvertime ? duration + Math.abs(timeLeft) : timeLeft;

    const format = (sec: number) => {
      const m = Math.floor(sec / 60)
        .toString()
        .padStart(2, '0');
      const s = (sec % 60).toString().padStart(2, '0');
      return { m, s };
    };

    const main = format(Math.max(0, totalSeconds));
    const over = isOvertime ? format(Math.abs(timeLeft)) : null;

    return {
      minutes: main.m,
      seconds: main.s,
      overtimeMinutes: over?.m,
      overtimeSeconds: over?.s,
    };
  };

  const {
    minutes: m,
    seconds: s,
    overtimeMinutes: om,
    overtimeSeconds: os,
  } = getDisplayTime();

  const switchMode = useCallback(() => {
    const newMode = isBreak ? 'work' : 'break';
    setMode(newMode);

    if (newMode === 'work' && isBreak) {
      incrementSession();
    }

    // Worker'ı yeni mod için resetle/başlat (Opsiyonel: START gönderilebilir)
    workerRef.current?.postMessage('START');
    startTimer();
  }, [isBreak, setMode, incrementSession, startTimer]);

  const resetAndClose = async () => {
    if (userId && sessionId) {
      await deletePomodoroSession(sessionId);
    }
    workerRef.current?.postMessage('RESET');
    const { resetAll } = useTimerStore.getState();
    resetAll();
    setHasRestored(true);
  };

  return {
    mode: isBreak ? 'break' : 'work',
    status: isActive ? 'running' : 'paused',
    minutes: m,
    seconds: s,
    isActive,
    startTime,
    totalPaused: getPauseDuration(),
    selectedCourse,
    sessionCount,
    start: handleStart,
    pause: () => {
      workerRef.current?.postMessage('PAUSE');
      pauseTimer();
    },
    reset: () => {
      workerRef.current?.postMessage('RESET');
      resetTimer();
    },
    resetAndClose,
    switchMode,
    setCourse,
    overtimeMinutes: om,
    overtimeSeconds: os,
    isOvertime: timeLeft < 0,
    totalElapsed: duration - timeLeft,
    activeDuration: (duration - timeLeft) * 1000,
    timeline,
    sessionId,
    finishDay: async () => {
      workerRef.current?.postMessage('RESET');
      const { resetAll } = useTimerStore.getState();
      resetAll();
    },
    duration,
    timeLeft,
    isOpen: isWidgetOpen,
    setOpen: setWidgetOpen,
    originalStartTime,
    pauseStartTime,
    workerRef, // Test ortamı için ekledik
  };
}
