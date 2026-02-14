import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  X,
  Coffee,
  Briefcase,
  CheckCircle2,
  Target,
  Search,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/shared/utils';
import { Button } from '@/shared/components/ui/button';
import { usePomodoro } from '@/features/pomodoro';
import { useAuth } from '@/features/auth';
import { upsertPomodoroSession } from '@/shared/services/client-db';
import { coursesData } from '@/features/courses';
import { logger } from '@/shared/utils/logger';
import { Json } from '@/shared/types/database.types';

// Dialog/Alert Components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';

export function PomodoroModal() {
  const {
    mode,
    status,
    minutes,
    seconds,
    overtimeMinutes,
    overtimeSeconds,
    start,
    pause,
    switchMode,
    finishDay,
    selectedCourse,
    setCourse,
    startTime,
    timeline,
    isOpen,
    setOpen,
    resetAndClose,
    sessionId,
    duration,
    sessionCount,
    timeLeft,
    isOvertime,
    originalStartTime,
    pauseStartTime,
  } = usePomodoro();

  const [pauseDuration, setPauseDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pauseStartTime && status === 'paused') {
      interval = setInterval(() => {
        setPauseDuration(Math.floor((Date.now() - pauseStartTime) / 1000));
      }, 1000);
    } else {
      Promise.resolve().then(() => setPauseDuration(0));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pauseStartTime, status]);

  const { user } = useAuth();
  const userId = user?.id;

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCloseAlert, setShowCloseAlert] = useState(false);
  const [showFinishAlert, setShowFinishAlert] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

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
  const isRunning = status === 'running';

  const courseOptions = useMemo(() => {
    return (
      coursesData as {
        category: string;
        courses: { id: string; name: string }[];
      }[]
    ).flatMap((category) =>
      category.courses.map((course) => ({
        id: course.id,
        name: course.name,
        category: category.category,
      }))
    );
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return coursesData;
    const query = searchQuery.toLowerCase();

    return (
      coursesData as {
        category: string;
        courses: { id: string; name: string }[];
      }[]
    )
      .map((cat) => ({
        ...cat,
        courses: cat.courses.filter((c) =>
          c.name.toLowerCase().includes(query)
        ),
      }))
      .filter((cat) => cat.courses.length > 0);
  }, [searchQuery]);

  const handleCourseSelect = (courseId: string) => {
    const course = courseOptions.find((c) => c.id === courseId);
    if (course) setCourse(course);
  };

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

      // Close any open entries in the timeline
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
        <div
          className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm pointer-events-auto"
          onClick={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
          >
            <div className="p-5 border-b border-border bg-muted/20 relative">
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Target size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-foreground">
                    Hedef Belirle
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Bugünkü odağın ne olacak?
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-card">
              <div className="relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <input
                  className="w-full bg-secondary/50 border border-transparent rounded-xl py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  placeholder="Ders veya konu ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[320px] overflow-y-auto px-4 pb-4 custom-scrollbar space-y-4 bg-card">
              {filteredCategories.length > 0 ? (
                (
                  filteredCategories as {
                    category: string;
                    courses: { id: string; name: string }[];
                  }[]
                ).map((cat, idx) => (
                  <div key={idx}>
                    <h3 className="text-xs font-bold text-primary/80 uppercase tracking-wider mb-2 px-2">
                      {cat.category.replace(/\(.*\)/, '')}
                    </h3>
                    <div className="space-y-1">
                      {cat.courses.map((course) => (
                        <button
                          key={course.id}
                          onClick={() => handleCourseSelect(course.id)}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-secondary/80 active:bg-secondary transition-colors flex items-center justify-between group"
                        >
                          <span className="text-foreground/80 group-hover:text-foreground font-medium">
                            {course.name}
                          </span>
                          <Play
                            size={16}
                            className="text-primary opacity-0 group-hover:opacity-100"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  Sonuç bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 flex items-end justify-start p-4 sm:p-6 pointer-events-none">
          <div
            className={cn(
              'pointer-events-auto relative overflow-hidden backdrop-blur-3xl border shadow-2xl',
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
            <div className="relative z-10 flex flex-col items-center w-full">
              <div className="w-full flex items-center justify-between px-5 pt-4 mb-2">
                <div
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-2 max-w-[70%] cursor-pointer"
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isWorking
                        ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]'
                        : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    )}
                  />
                  <span className="text-[13px] font-black text-foreground/90 tracking-normal uppercase leading-none">
                    {selectedCourse.name}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <Minimize2 size={14} />
                    ) : (
                      <Maximize2 size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => setShowCloseAlert(true)}
                    className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  'relative flex items-center justify-center cursor-pointer',
                  isExpanded ? 'w-64 h-64' : 'w-40 h-40'
                )}
              >
                <svg
                  className="w-full h-full transform -rotate-90 absolute"
                  viewBox="0 0 224 224"
                >
                  <circle
                    cx="112"
                    cy="112"
                    r="100"
                    stroke="currentColor"
                    strokeWidth={isExpanded ? '6' : '8'}
                    fill="transparent"
                    className="text-secondary/50"
                  />
                  <circle
                    cx="112"
                    cy="112"
                    r="100"
                    stroke={
                      isOvertime
                        ? '#f97316'
                        : isWorking
                          ? 'var(--color-primary)'
                          : '#10b981'
                    }
                    strokeWidth={isExpanded ? '6' : '8'}
                    strokeDasharray={2 * Math.PI * 100}
                    strokeDashoffset={
                      2 * Math.PI * 100 * (isOvertime ? 0 : 1 - progress / 100)
                    }
                    strokeLinecap="round"
                    fill="transparent"
                    className="drop-shadow-lg"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <div className="flex flex-col items-center justify-center -translate-y-4">
                    <span
                      className={cn(
                        'font-heading font-black tracking-tighter tabular-nums leading-none drop-shadow-sm',
                        isExpanded ? 'text-6xl' : 'text-3xl',
                        isOvertime ? 'text-orange-500' : 'text-foreground'
                      )}
                    >
                      {minutes}:{seconds}
                    </span>
                    <div className="flex flex-col items-center justify-center h-0 relative">
                      <div className="absolute top-1 whitespace-nowrap flex flex-col items-center">
                        {isOvertime && (
                          <span className="text-orange-500 font-bold text-sm">
                            +{overtimeMinutes}:{overtimeSeconds}
                          </span>
                        )}
                        {status === 'paused' && pauseDuration > 0 && (
                          <span className="text-muted-foreground font-bold text-xs">
                            Duraklatma:{' '}
                            {Math.floor(pauseDuration / 60)
                              .toString()
                              .padStart(2, '0')}
                            :{(pauseDuration % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                        {isExpanded && !isOvertime && (
                          <span
                            className={cn(
                              'text-[11px] font-black tracking-[0.3em] uppercase',
                              isWorking ? 'text-primary' : 'text-emerald-400'
                            )}
                          >
                            {isWorking ? 'ÇALIŞMA' : 'MOLA'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  'w-full flex flex-col gap-3 px-6 pb-6 pt-2',
                  !isExpanded && 'px-4 pb-4 pt-1'
                )}
              >
                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={isRunning ? pause : start}
                    className={cn(
                      'flex items-center justify-center rounded-2xl shadow-xl group w-full',
                      isExpanded ? 'h-14' : 'h-11',
                      isRunning
                        ? 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                        : isWorking
                          ? 'bg-primary text-primary-foreground hover:bg-primary/95'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    )}
                  >
                    {isRunning ? (
                      <Pause
                        size={isExpanded ? 20 : 16}
                        fill="currentColor"
                        className="mr-2"
                      />
                    ) : (
                      <Play
                        size={isExpanded ? 20 : 16}
                        fill="currentColor"
                        className="mr-2"
                      />
                    )}
                    <span
                      className={cn(
                        'font-black tracking-tight',
                        isExpanded ? 'text-base' : 'text-xs'
                      )}
                    >
                      {isRunning ? 'DURAKLAT' : 'BAŞLAT'}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="ghost"
                        onClick={handleSwitchMode}
                        className={cn(
                          'h-12 flex-1 rounded-xl gap-2 text-sm font-black',
                          isWorking
                            ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                        )}
                      >
                        {isWorking ? (
                          <Coffee size={18} />
                        ) : (
                          <Briefcase size={18} />
                        )}
                        <span>{isWorking ? 'Mola' : 'Çalış'}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setShowFinishAlert(true)}
                        className="h-12 flex-1 rounded-xl gap-2 text-sm font-black bg-destructive/10 text-destructive hover:bg-destructive/20"
                      >
                        <CheckCircle2 size={18} />
                        <span>Günü Bitir</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="w-full px-5 pb-4 flex items-center justify-center text-[10px] font-black text-primary uppercase tracking-[0.3em] border-t border-primary/10 pt-4">
                  <span className="bg-primary/10 px-3 py-1 rounded-full">
                    OTURUM {sessionCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Close Alert */}
      <AlertDialog open={showCloseAlert} onOpenChange={setShowCloseAlert}>
        <AlertDialogContent className="bg-card border-border text-foreground rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Oturumu Kapat</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Mevcut oturumun kaydedilmeyecek. Emin misin?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border bg-secondary text-foreground">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClose}
              className="rounded-xl bg-destructive text-destructive-foreground"
            >
              Kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Finish Alert */}
      <AlertDialog open={showFinishAlert} onOpenChange={setShowFinishAlert}>
        <AlertDialogContent className="bg-card border-border text-foreground rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Günü Tamamla</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tüm çalışmaların kaydedilecek. Günü bitirmek istiyor musun?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border bg-secondary text-foreground">
              Devam Et
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmFinish}
              className="rounded-xl bg-emerald-600 text-white"
            >
              Bitir ve Kaydet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
    document.body
  );
}
