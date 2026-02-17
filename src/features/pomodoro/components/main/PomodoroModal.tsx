import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/core';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { upsertPomodoroSession } from '@/features/pomodoro/services/pomodoroService';
import { logger } from '@/utils/logger';
import { Json } from '@/types/database.types';

// Sub-components
import { CourseSelector } from '../modal/CourseSelector';
import { TimerDisplay } from '../modal/TimerDisplay';
import { TimerControls } from '../modal/TimerControls';
import { PomodoroAlerts } from '../modal/PomodoroAlerts';

export function PomodoroModal() {
  const {
    mode,
    startTime,
    timeline,
    isOpen,
    setOpen,
    resetAndClose,
    sessionId,
    duration,
    timeLeft,
    originalStartTime,
    selectedCourse,
    switchMode,
    finishDay,
  } = usePomodoro();

  const { user } = useAuth();
  const userId = user?.id;

  const [showCloseAlert, setShowCloseAlert] = useState(false);
  const [showFinishAlert, setShowFinishAlert] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!selectedCourse && isOpen) {
          setOpen(false);
        } else if (isExpanded) {
          setIsExpanded(false);
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, selectedCourse, isExpanded, setOpen]);

  const isWorking = mode === 'work';

  const performSave = async () => {
    if (!selectedCourse || !startTime) return;
    const closedTimeline = timeline.map(
      (e: { start: number; end?: number; type: string }) => ({
        ...e,
        end: e.end || Date.now(),
      })
    );

    try {
      await upsertPomodoroSession(
        {
          id: sessionId || crypto.randomUUID(),
          courseId: selectedCourse.id,
          courseName: selectedCourse.name,
          timeline: closedTimeline as Json[],
          startedAt: originalStartTime || startTime,
        },
        userId || ''
      );
    } catch (error) {
      logger.error('Pomodoro save error:', error as Error);
    }
  };

  const handleSwitchMode = async () => {
    await performSave();
    switchMode();
  };

  const confirmClose = async () => {
    setShowCloseAlert(false);
    await resetAndClose();
  };

  const confirmFinish = async () => {
    if (userId && selectedCourse && sessionId) {
      const finalStartedAt = originalStartTime || startTime || Date.now();

      const closedTimeline = timeline.map(
        (e: { start: number; end?: number; type: string }) => ({
          ...e,
          end: e.end || Date.now(),
        })
      );

      await upsertPomodoroSession(
        {
          id: sessionId,
          courseId: selectedCourse.id,
          courseName: selectedCourse.name,
          timeline: closedTimeline as Json[],
          startedAt: finalStartedAt,
          isCompleted: true,
        },
        userId
      );
    }
    await finishDay();
    setShowFinishAlert(false);
    setOpen(false);
  };

  const progress = useMemo(() => {
    if (timeLeft <= 0) return 100;
    if (duration <= 0) return 0;
    return Math.min(100, ((duration - timeLeft) / duration) * 100);
  }, [timeLeft, duration]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      if (!selectedCourse) {
        setOpen(false);
      }
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      {!selectedCourse ? (
        <CourseSelector
          onClose={() => setOpen(false)}
          modalRef={modalRef}
          onBackdropClick={handleBackdropClick}
        />
      ) : (
        <div className="fixed inset-0 flex items-end justify-start p-4 sm:p-6 pointer-events-none">
          <div
            className={cn(
              'pointer-events-auto relative overflow-hidden backdrop-blur-3xl border shadow-2xl transition-all duration-300',
              isExpanded
                ? 'rounded-[40px] w-[340px]'
                : 'rounded-[28px] w-[220px]',
              isWorking
                ? 'bg-card/90 border-primary/20 shadow-primary/5'
                : 'bg-card/90 border-emerald-500/20 shadow-emerald-500/5'
            )}
          >
            <div
              className={cn(
                'absolute inset-0 opacity-20 pointer-events-none',
                isWorking
                  ? 'bg-linear-to-br from-primary/30 via-primary/5 to-transparent'
                  : 'bg-linear-to-br from-emerald-500/30 via-emerald-500/5 to-transparent'
              )}
            />
            <div
              className={cn(
                'absolute -top-24 -left-24 w-48 h-48 blur-[80px] rounded-full',
                isWorking ? 'bg-primary/40' : 'bg-emerald-500/40'
              )}
            />

            <TimerDisplay
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
              onClose={() => setShowCloseAlert(true)}
              progress={progress}
            />

            <TimerControls
              isExpanded={isExpanded}
              onSwitchMode={handleSwitchMode}
              onFinishDay={() => setShowFinishAlert(true)}
            />
          </div>
        </div>
      )}

      <PomodoroAlerts
        showCloseAlert={showCloseAlert}
        setShowCloseAlert={setShowCloseAlert}
        showFinishAlert={showFinishAlert}
        setShowFinishAlert={setShowFinishAlert}
        onConfirmClose={confirmClose}
        onConfirmFinish={confirmFinish}
      />
    </div>,
    document.body
  );
}
