"use client";

import { usePomodoro } from "@/hooks/usePomodoro";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Coffee,
  Briefcase,
  Flag,
  ChevronRight,
  Search,
  X,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import coursesData from "@/data/courses.json";
import { useState, useMemo, useEffect } from "react";
import { upsertPomodoroSession } from "@/lib/client-db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { createPortal } from "react-dom";

const WORK_LIMIT = 50 * 60 * 1000;
const BREAK_LIMIT = 10 * 60 * 1000;

export function PomodoroModal() {
  const {
    mode,
    status,
    minutes,
    seconds,
    isOvertime,
    start,
    pause,
    switchMode,
    finishDay,
    selectedCourse,
    setCourse,
    activeDuration,
    startTime,
    timeline,
    isOpen,
    setOpen,
    sessionCount,
    resetAndClose,
    sessionId,
  } = usePomodoro();

  const [showCloseAlert, setShowCloseAlert] = useState(false);
  const [showFinishAlert, setShowFinishAlert] = useState(false);
  // showSelectionCloseAlert unused state removed
  const { user } = useAuth();
  const userId = user?.id;

  // Request notification permission on mount
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // Progress calculation
  const progress = useMemo(() => {
    if (isOvertime) return 100;
    const limit = mode === "work" ? WORK_LIMIT : BREAK_LIMIT;
    return Math.min(100, (activeDuration / limit) * 100);
  }, [activeDuration, mode, isOvertime]);

  const courseOptions = useMemo(() => {
    const options: { id: string; name: string; category: string }[] = [];
    coursesData.forEach((category) => {
      category.courses.forEach((course) => {
        options.push({
          id: course.id,
          name: course.name,
          category: category.category,
        });
      });
    });
    return options;
  }, []);

  const isWorking = mode === "work";

  // Dynamic styles based on mode
  const colors = {
    primary: isOvertime
      ? "text-red-500"
      : isWorking
      ? "text-blue-400"
      : "text-emerald-400",
    bg: isOvertime
      ? "bg-red-500/10"
      : isWorking
      ? "bg-blue-500/10"
      : "bg-emerald-500/10",
    border: isOvertime
      ? "border-red-500/20"
      : isWorking
      ? "border-blue-500/20"
      : "border-emerald-500/20",
    glow: isOvertime
      ? "shadow-[0_0_40px_-5px_rgba(239,68,68,0.3)]"
      : isWorking
      ? "shadow-[0_0_40px_-5px_rgba(59,130,246,0.2)]"
      : "shadow-[0_0_40px_-5px_rgba(16,185,129,0.2)]",
    ring: isOvertime ? "#ef4444" : isWorking ? "#3b82f6" : "#10b981",
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOpen(false);
    } else {
      setOpen(true);
    }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await upsertPomodoroSession(
        {
          id: sessionId || crypto.randomUUID(),
          courseId: selectedCourse.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          timeline: closedTimeline as any,
          startedAt: startTime,
        },
        userId || ""
      );

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success("Oturum başarıyla kaydedildi.");
    } catch (error) {
      toast.error("Oturum kaydedilirken bir sorun oluştu.");
      console.error(error);
    }
  };

  const confirmClose = async () => {
    setShowCloseAlert(false);
    await resetAndClose();
  };

  const confirmFinish = async () => {
    await performSave();
    setShowFinishAlert(false);
    finishDay();
    setOpen(false);
  };

  const handleSwitchMode = async () => {
    await performSave();
    switchMode();
  };

  const handleCourseSelect = (value: string) => {
    const course = courseOptions.find((c) => c.id === value);
    if (course) {
      setCourse(course);
    }
  };

  // --- Components ---

  const ProgressRing = ({ size = 220 }: { size?: number }) => {
    const radius = size / 2 - 12;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/5"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={colors.ring}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 12px ${colors.ring}40)`,
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-3xl font-bold font-mono tracking-tighter leading-none",
              isOvertime ? "text-red-500 animate-pulse" : "text-foreground"
            )}
          >
            {minutes}:{seconds}
          </span>
          <span className="text-[11px] font-black text-muted-foreground mt-1.5 tracking-widest uppercase">
            Oturum #{sessionCount}
          </span>
        </div>
      </div>
    );
  };

  // Selection View
  if (!selectedCourse) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-[500px] border-border/40 p-0 overflow-hidden bg-background/95 backdrop-blur-xl shadow-2xl rounded-3xl">
            <div className="p-8 pb-4 relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Search className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">
                    Ders Seçimi
                  </DialogTitle>
                  <DialogDescription className="text-base text-muted-foreground">
                    Odaklanmak istediğin dersi seçerek oturumu başlat.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="px-6 pb-8 h-[450px]">
              <Command className="rounded-2xl border bg-transparent overflow-hidden">
                <CommandInput
                  placeholder="Derslerde ara..."
                  className="h-14 text-base border-none ring-0 focus:ring-0"
                />
                <CommandList className="max-h-full py-2">
                  <CommandEmpty className="py-12 text-center text-muted-foreground">
                    Aradığınız ders bulunamadı.
                  </CommandEmpty>
                  {coursesData.map((category) => (
                    <CommandGroup
                      key={category.category}
                      heading={category.category.replace(
                        /\s*\(Toplam:.*?\)/,
                        ""
                      )}
                      className="px-3"
                    >
                      {category.courses.map((course) => (
                        <CommandItem
                          key={course.id}
                          value={course.id}
                          keywords={[course.name]}
                          onSelect={() => handleCourseSelect(course.id)}
                          disabled={false}
                          className="group flex items-center justify-between py-4 px-4 my-1 cursor-pointer rounded-xl transition-all hover:bg-primary/5 aria-selected:bg-primary/10 pointer-events-auto! opacity-100!"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-[15px]">
                              {course.name}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Timer View - Fixed Widget
  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed bottom-8 left-8 z-50 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto bg-background  border border-white/10 rounded-[2.5rem]  p-7 flex flex-col items-center transition-all duration-700 w-[280px] relative",
            colors.glow
          )}
        >
          {/* Widget Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 rounded-full w-7 h-7 text-muted-foreground hover:bg-white/10 transition-colors"
            onClick={() => setShowCloseAlert(true)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>

          {/* Header */}
          <div className="flex flex-col items-center gap-0.5 mb-4 text-center">
            <h2
              className={cn(
                "text-lg font-black uppercase tracking-wider",
                colors.primary
              )}
            >
              {isOvertime ? "EK SÜRE" : isWorking ? "ÇALIŞMA" : "MOLA"}
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
              <BookOpen className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wide truncate">
                {selectedCourse.name}
              </span>
            </div>
          </div>

          {/* Ring Container */}
          <div className="relative mb-5 group">
            <div
              className={cn(
                "absolute inset-0 rounded-full blur-2xl opacity-10  ",
                isOvertime
                  ? "bg-red-500"
                  : isWorking
                  ? "bg-blue-500"
                  : "bg-emerald-500"
              )}
            />
            <ProgressRing size={170} />
          </div>

          {/* Controls Stack */}
          <div className="w-full flex flex-col gap-3">
            <Button
              onClick={status === "running" ? pause : start}
              className={cn(
                "w-full h-12 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-black/10",
                status === "running"
                  ? "bg-white/5 hover:bg-white/10 text-foreground border border-white/10"
                  : cn(
                      "text-white border-none",
                      isWorking
                        ? "bg-blue-600 hover:bg-blue-500"
                        : "bg-emerald-600 hover:bg-emerald-500"
                    )
              )}
            >
              {status === "running" ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span className="text-base font-bold">Duraklat</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span className="text-base font-bold">Devam Et</span>
                </>
              )}
            </Button>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                onClick={handleSwitchMode}
                className="h-11 rounded-xl border-white/5 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 p-0 transition-all hover:-translate-y-0.5"
                title={isWorking ? "Mola Ver" : "Çalışmaya Başla"}
              >
                {isWorking ? (
                  <Coffee className="w-4 h-4 text-white" />
                ) : (
                  <Briefcase className="w-4 h-4 text-white" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-tight text-white">
                  {isWorking ? "MOLA" : "ÇALIŞ"}
                </span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowFinishAlert(true)}
                className="h-11 rounded-xl border-red-500/10 bg-red-500/20 hover:bg-red-500/30  hover:text-red-500/10 flex items-center justify-center gap-2 p-0 transition-all hover:-translate-y-0.5"
                title="Günü Bitir"
              >
                <Flag className="w-4 h-4 text-white" />
                <span className="text-[10px] font-bold uppercase tracking-tight text-white">
                  BİTİR
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showCloseAlert} onOpenChange={setShowCloseAlert}>
        <AlertDialogContent className="rounded-[2.5rem] border-border/40 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">
              Oturumu Kapat?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground">
              Aktif oturum sonlandırılacak ve ilerlemeniz silinecektir. Yeniden
              başlamak istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-2xl h-10 font-medium">
              Vazgeç
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClose}
              className="bg-red-500/50 hover:bg-red-500/60 text-white rounded-2xl h-10 px-8 font-medium"
            >
              Evet, Sıfırla ve Kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFinishAlert} onOpenChange={setShowFinishAlert}>
        <AlertDialogContent className="rounded-[2.5rem] border-border/40 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">
              Günü Bitir?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground">
              Mevcut çalışma verileriniz kaydedilecek ve tüm sayaçlar
              sıfırlanacaktır. Devam etmek istiyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-2xl h-12 font-medium">
              Vazgeç
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmFinish}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-12 px-8 font-bold"
            >
              Günü Bitir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body
  );
}
