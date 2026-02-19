import { useCallback, useEffect, useRef } from 'react';
import { z } from 'zod';
import {
  useTimerStore,
  usePomodoroSessionStore,
  usePomodoroUIStore,
} from '@/features/pomodoro/store';
import {
  deletePomodoroSession,
  getDailySessionCount,
  upsertPomodoroSession,
} from '@/features/pomodoro/services/pomodoroService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { unlockAudio } from '../logic/audioUtils';
import { logger } from '@/utils/logger';

// Timeline event schema for validation
const TimelineEventSchema = z.object({
  type: z.enum(['work', 'break', 'pause']),
  start: z.number(),
  end: z.number().optional(),
});

const TimelineSchema = z.array(TimelineEventSchema);

export type PomodoroMode = 'work' | 'break';

export function usePomodoro() {
  // Timer state
  const {
    timeLeft,
    isActive,
    isBreak,
    startTime,
    duration,
    pauseStartTime,
    startTimer,
    pauseTimer,
    resetTimer,
    setMode,
  } = useTimerStore();

  // Session state
  const {
    sessionId,
    sessionCount,
    incrementSession,
    setSessionId,
    timeline,
    setSessionCount,
    setHasRestored,
    originalStartTime,
    getPauseDuration,
    resetSession,
    addTimelineEvent,
  } = usePomodoroSessionStore();

  // UI state
  const { selectedCourse, setCourse, isWidgetOpen, setWidgetOpen } =
    usePomodoroUIStore();

  const tick = useTimerStore((state) => state.tick);

  const { user } = useAuth();
  const userId = user?.id;

  // --- 1. WORKER KURULUMU VE YÖNETİMİ ---
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Worker'ı başlatıyoruz (Vite URL yapısı)
    const worker = new Worker(
      new URL('../../../workers/timerWorker.ts', import.meta.url),
      { type: 'module' }
    );

    // Worker'dan gelen 'TICK' mesajlarını dinle
    workerRef.current = worker;
    workerRef.current.onmessage = (e) => {
      if (e.data === 'TICK') {
        tick();
      }
    };

    // Component kapandığında worker'ı sonlandır (Memory leak önleme)
    return () => {
      workerRef.current!.onmessage = null;
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

    // Timeline'a work event ekle
    addTimelineEvent({ type: 'work', start: now });

    // Veritabanı Kaydı (First Insert Strategy)
    if (userId && currentSessionId && selectedCourse) {
      try {
        await upsertPomodoroSession(
          {
            id: currentSessionId,
            courseId: selectedCourse.id,
            courseName: selectedCourse.name,
            timeline: TimelineSchema.parse(
              timeline.length > 0 ? timeline : [{ type: 'work', start: now }]
            ),
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

    // Worker'ı yeni mod için resetle/başlat
    workerRef.current?.postMessage('START');
    startTimer();
  }, [isBreak, setMode, incrementSession, startTimer]);

  const resetAndClose = async () => {
    if (userId && sessionId) {
      await deletePomodoroSession(sessionId);
    }
    workerRef.current?.postMessage('RESET');
    resetTimer();
    resetSession();
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
      resetTimer();
      resetSession();
    },
    duration,
    timeLeft,
    isOpen: isWidgetOpen,
    setOpen: setWidgetOpen,
    originalStartTime,
    pauseStartTime,
    workerRef,
  };
}
