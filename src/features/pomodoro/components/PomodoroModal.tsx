import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/stringHelpers';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { upsertPomodoroSession } from '@/features/pomodoro/services/pomodoroService';
import { Json } from '@/types/database.types';

// Sub-components
import { CourseSelector } from './CourseSelector';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { PomodoroAlerts } from './PomodoroAlerts';

export function PomodoroModal() {
  const {
    mode,
    status,
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

  /* const performSave = async () => {
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
  }; */

  const handleSwitchMode = async () => {
    switchMode();
  };

  const confirmClose = async () => {
    setShowCloseAlert(false);
    await resetAndClose();
    setOpen(false);
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

  const progress =
    timeLeft <= 0
      ? 100
      : duration <= 0
        ? 0
        : Math.min(100, ((duration - timeLeft) / duration) * 100);

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
      <AnimatePresence>
        {!selectedCourse ? (
          <CourseSelector
            onClose={() => setOpen(false)}
            modalRef={modalRef}
            onBackdropClick={handleBackdropClick}
          />
        ) : (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed inset-x-0 bottom-8 flex justify-center px-4 pointer-events-none"
          >
            <motion.div
              layout
              ref={modalRef}
              className={cn(
                'pointer-events-auto relative overflow-hidden',
                'rounded-2xl flex items-center h-20 px-8 gap-6 min-w-[640px] shadow-2xl shadow-black/80',
                'transition-colors duration-700 ease-in-out',
                status === 'paused'
                  ? 'bg-gray-800'
                  : isWorking
                    ? 'bg-emerald-950'
                    : 'bg-amber-950'
              )}
            >
              {/* Progress Line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5">
                <motion.div
                  className={cn(
                    'h-full',
                    isWorking ? 'bg-primary' : 'bg-emerald-500'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* 3-column layout: Left | Center | Right rendered by sub-components */}
              <TimerDisplay />

              <TimerControls
                isExpanded={isExpanded}
                onSwitchMode={handleSwitchMode}
                onFinishDay={() => setShowFinishAlert(true)}
                onDiscard={() => setShowCloseAlert(true)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
