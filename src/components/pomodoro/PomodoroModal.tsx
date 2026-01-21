"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Pause, X, Coffee, Briefcase, CheckCircle2, 
  Target, Search, ChevronUp, Maximize2, Minimize2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePomodoro } from "@/hooks/usePomodoro";
import { useAuth } from "@/hooks/useAuth";
import { upsertPomodoroSession } from "@/lib/client-db";
import coursesData from "@/data/courses.json";
import { Json } from "@/lib/types/supabase";

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
} from "@/components/ui/alert-dialog";

export function PomodoroModal() {
  const {
    mode,
    status,
    minutes,
    seconds,
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
  } = usePomodoro();

  const { user } = useAuth();
  const userId = user?.id;

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCloseAlert, setShowCloseAlert] = useState(false);
  const [showFinishAlert, setShowFinishAlert] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Expanded state for the timer widget
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key to close modal or selection view
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!selectedCourse && isOpen) {
          setOpen(false);
        } else if (isExpanded) {
          setIsExpanded(false);
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, selectedCourse, isExpanded, setOpen]);

  const isWorking = mode === "work";
  const isRunning = status === "running";

  // Data Logic
  const courseOptions = useMemo(() => {
    return coursesData.flatMap(category => 
      category.courses.map(course => ({
        id: course.id,
        name: course.name,
        category: category.category
      }))
    );
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return coursesData;
    const query = searchQuery.toLowerCase();
    
    return coursesData.map(cat => ({
      ...cat,
      courses: cat.courses.filter(c => c.name.toLowerCase().includes(query))
    })).filter(cat => cat.courses.length > 0);
  }, [searchQuery]);

  // Action Handlers
  const handleCourseSelect = (courseId: string) => {
    const course = courseOptions.find((c) => c.id === courseId);
    if (course) setCourse(course);
  };

  const performSave = async () => {
    if (!selectedCourse || !startTime) return;
    const closedTimeline = timeline.map((e: any) => ({
      ...e,
      end: e.end || Date.now(),
    }));

    try {
      await upsertPomodoroSession(
        {
          id: sessionId || crypto.randomUUID(),
          courseId: selectedCourse.id,
          courseName: selectedCourse.name,
          timeline: closedTimeline as unknown as Json[],
          startedAt: startTime,
        },
        userId || ""
      );
    } catch (error) {
      console.error(error);
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
    await performSave();
    await finishDay();
    setShowFinishAlert(false);
    setOpen(false);
  };

  const progress = useMemo(() => {
     if (timeLeft <= 0) return 100;
     if (duration <= 0) return 0;
     return Math.min(100, ((duration - timeLeft) / duration) * 100);
   }, [timeLeft, duration]);

   // Handle backdrop click
   const handleBackdropClick = (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
          if (!selectedCourse) {
            setOpen(false);
          }
      }
   };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all",
        !selectedCourse ? "bg-black/40 backdrop-blur-sm items-center" : "items-end justify-start pointer-events-none"
      )}
      onClick={handleBackdropClick}
    >
      <AnimatePresence mode="wait">
        {!selectedCourse ? (
          // SELECTION VIEW (GOAL MODAL)
          <motion.div
             key="selection"
             ref={modalRef}
             initial={{ opacity: 0, scale: 0.95, y: 10 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.95, y: 10 }}
             className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="p-5 border-b border-border bg-muted/20 relative">
               <button 
                  onClick={() => setOpen(false)}
                  className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
               >
                  <X size={20} />
               </button>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Target size={24} />
                </div>
                <div>
                   <h2 className="text-xl font-heading font-bold text-foreground">Hedef Belirle</h2>
                   <p className="text-sm text-muted-foreground">Bugünkü odağın ne olacak?</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="p-3 bg-card">
               <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    className="w-full bg-secondary/50 border border-transparent focus:border-primary/20 rounded-xl py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    placeholder="Ders veya konu ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
               </div>
            </div>

            {/* List */}
            <div className="max-h-[320px] overflow-y-auto px-4 pb-4 custom-scrollbar space-y-4 bg-card">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat, idx) => (
                   <div key={idx}>
                     <h3 className="text-xs font-bold text-primary/80 uppercase tracking-wider mb-2 px-2">
                       {cat.category.replace(/\(.*\)/, '')}
                     </h3>
                     <div className="space-y-1">
                       {cat.courses.map(course => (
                         <button
                           key={course.id}
                           onClick={() => handleCourseSelect(course.id)}
                           className="w-full text-left px-4 py-3 rounded-xl hover:bg-secondary/80 active:bg-secondary transition-colors flex items-center justify-between group"
                         >
                            <span className="text-foreground/80 group-hover:text-foreground font-medium transition-colors">
                              {course.name}
                            </span>
                            <Play size={16} className="text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
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
          </motion.div>
        ) : (
          // UNIFIED TIMER WIDGET VIEW
          <motion.div
            key="timer"
            layout
            transition={{ 
              layout: { type: "spring", stiffness: 350, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={cn(
              "pointer-events-auto relative overflow-hidden backdrop-blur-3xl border shadow-2xl transition-colors duration-500",
              isExpanded ? "rounded-[40px] w-[340px]" : "rounded-[28px] w-[220px]",
              isWorking 
                ? "bg-card/90 border-primary/20 shadow-primary/5" 
                : "bg-card/90 border-emerald-500/20 shadow-emerald-500/5"
            )}
          >
            {/* Dynamic Background Mesh */}
            <div className={cn(
              "absolute inset-0 opacity-20 pointer-events-none transition-all duration-700",
              isWorking 
                ? "bg-linear-to-br from-primary/30 via-primary/5 to-transparent" 
                : "bg-linear-to-br from-emerald-500/30 via-emerald-500/5 to-transparent"
            )} />
            
            {/* Additional Glow for Focus/Break */}
            <div className={cn(
              "absolute -top-24 -left-24 w-48 h-48 blur-[80px] rounded-full transition-colors duration-1000",
              isWorking ? "bg-primary/40" : "bg-emerald-500/40"
            )} />

             <div className="relative z-10 flex flex-col items-center w-full">
              
              {/* Header Info */}
              <div className="w-full flex items-center justify-between px-5 pt-4 mb-2">
                 <motion.div layout className="flex items-center gap-2 max-w-[70%]">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isRunning ? "animate-pulse" : "",
                      isWorking ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    )} />
                    <span className="text-[11px] font-black text-foreground/90 tracking-tighter uppercase leading-none">
                      {selectedCourse.name}
                    </span>
                 </motion.div>
                 
                 <motion.div layout className="flex gap-1">
                   <button 
                     onClick={() => setIsExpanded(!isExpanded)}
                     className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-all hover:scale-110 active:scale-90"
                   >
                     {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                   </button>
                   <button 
                     onClick={() => setShowCloseAlert(true)}
                     className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all hover:scale-110 active:scale-90"
                   >
                     <X size={14} />
                   </button>
                 </motion.div>
              </div>

              {/* Central Timer Ring Area */}
              <motion.div 
                layout
                className={cn(
                  "relative flex items-center justify-center transition-all duration-500",
                  isExpanded ? "w-64 h-64" : "w-40 h-40"
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
                    strokeWidth={isExpanded ? "6" : "8"}
                    fill="transparent"
                    className="text-secondary/50"
                  />
                  <motion.circle
                    cx="112"
                    cy="112"
                    r="100"
                    stroke={isWorking ? "var(--color-primary)" : "#10b981"}
                    strokeWidth={isExpanded ? "6" : "8"}
                    strokeDasharray={2 * Math.PI * 100}
                    initial={{ strokeDashoffset: 2 * Math.PI * 100 }}
                    animate={{ strokeDashoffset: (2 * Math.PI * 100) * (1 - progress / 100) }}
                    transition={{ duration: 1, ease: "linear" }}
                    strokeLinecap="round"
                    fill="transparent"
                    className="drop-shadow-lg"
                  />
                </svg>

                {/* Inner Text Container */}
                <div className="relative flex flex-col items-center justify-center pointer-events-none select-none">
                  <motion.span 
                    layout
                    className={cn(
                      "font-heading font-black tracking-tighter tabular-nums leading-none drop-shadow-sm transition-colors",
                      isExpanded ? "text-7xl" : "text-4xl",
                      isOvertime ? "text-red-500" : "text-foreground"
                    )}
                  >
                    {minutes}:{seconds}
                  </motion.span>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className={cn(
                          "mt-4 text-[13px] font-black tracking-[0.3em] uppercase transition-colors duration-500",
                          isWorking ? "text-primary" : "text-emerald-400"
                        )}
                      >
                        {isWorking ? "ÇALIŞMA" : "MOLA"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Unified Controls Area */}
              <div className={cn(
                "w-full flex flex-col gap-3 px-6 pb-6 pt-2",
                !isExpanded && "px-4 pb-4 pt-1"
              )}>
                 <motion.div layout className="flex flex-col gap-3 w-full">
                    {/* Primary Action: Start/Pause */}
                    <motion.button
                        whileHover={{ scale: 1.02, translateY: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={isRunning ? pause : start}
                        className={cn(
                          "transition-all flex items-center justify-center rounded-2xl shadow-xl group w-full",
                          isExpanded ? "h-14" : "h-11",
                          isRunning 
                            ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border" 
                            : (isWorking 
                                ? "bg-primary text-primary-foreground hover:shadow-primary/25 hover:bg-primary/95" 
                                : "bg-emerald-500 text-white hover:shadow-emerald-500/25 hover:bg-emerald-600")
                        )}
                    >
                        {isRunning ? (
                          <Pause size={isExpanded ? 20 : 16} fill="currentColor" className="mr-2" />
                        ) : (
                          <Play size={isExpanded ? 20 : 16} fill="currentColor" className="mr-2" />
                        )}
                        <motion.span layout className={cn("font-black tracking-tight", isExpanded ? "text-base" : "text-xs")}>
                          {isRunning ? "DURAKLAT" : "BAŞLAT"}
                        </motion.span>
                    </motion.button>
                    
                    {/* Secondary Actions Row */}
                    <AnimatePresence mode="popLayout">
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex gap-2 w-full"
                        >
                          <Button
                            variant="ghost"
                            onClick={handleSwitchMode}
                            className={cn(
                              "h-12 flex-1 rounded-xl gap-2 text-sm font-black transition-all hover:scale-[1.02] hover:-translate-y-0.5",
                              isWorking 
                                ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" 
                                : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                            )}
                          >
                             {isWorking ? <Coffee size={18} /> : <Briefcase size={18} />}
                             <span>{isWorking ? "Mola" : "Çalış"}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setShowFinishAlert(true)}
                            className="h-12 flex-1 rounded-xl gap-2 text-sm font-black bg-destructive/10 text-destructive hover:bg-destructive/20 hover:scale-[1.02] hover:-translate-y-0.5 transition-all"
                          >
                             <CheckCircle2 size={18} />
                             <span>Günü Bitir</span>
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </motion.div>
              </div>

              {/* Stats Bar */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    exit={{ opacity: 0 }}
                    className="w-full px-5 pb-4 flex items-center justify-center text-[10px] font-black text-primary uppercase tracking-[0.3em] border-t border-primary/10 pt-4"
                  >
                      <span className="bg-primary/10 px-3 py-1 rounded-full">OTURUM {sessionCount}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
             <AlertDialogCancel className="rounded-xl border-border bg-secondary hover:bg-secondary/80 text-foreground">İptal</AlertDialogCancel>
             <AlertDialogAction onClick={confirmClose} className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground">Kapat</AlertDialogAction>
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
             <AlertDialogCancel className="rounded-xl border-border bg-secondary hover:bg-secondary/80 text-foreground">Devam Et</AlertDialogCancel>
             <AlertDialogAction onClick={confirmFinish} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">Bitir ve Kaydet</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
    document.body
  );
}
