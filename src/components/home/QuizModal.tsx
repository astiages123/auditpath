"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Brain, FileText, ChevronRight, Loader2, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { getTopicQuestionCount, getFirstChunkIdForTopic, getCourseTopicsWithCounts, TopicWithCounts, getTopicCompletionStatus } from "@/lib/client-db";
import { QuizEngine } from "@/components/features/quiz/QuizEngine";
import { QuizSessionProvider } from "@/components/features/quiz/QuizSessionProvider";
import { QuizQuestion } from "@/lib/ai/quiz-api";
import { useAuth } from "@/hooks/useAuth"; 

interface QuizModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
}

export function QuizModal({ isOpen, onOpenChange, courseId, courseName }: QuizModalProps) {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicWithCounts[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithCounts | null>(null);
  const [targetChunkId, setTargetChunkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Status State
  const [completionStatus, setCompletionStatus] = useState<{
        completed: boolean;
        antrenman: { solved: number; total: number };
        deneme: { solved: number; total: number };
        arsiv: { solved: number; total: number };
        mistakes: { solved: number; total: number };
  } | null>(null);

  const [loadingCount, setLoadingCount] = useState(false);
  
  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>([]);
  
  // Quiz Engine State
  const [isQuizActive, setIsQuizActive] = useState(false);

  // Fetch topics when modal opens
  useEffect(() => {
    async function loadTopics() {
      if (isOpen && courseId) {
        setLoading(true);
        const data = await getCourseTopicsWithCounts(courseId);
        setTopics(data);
        setLoading(false);
      }
    }
    loadTopics();
  }, [isOpen, courseId]);

  // Fetch question count and chunk ID when topic is selected
  useEffect(() => {
    async function loadData() {
      if (selectedTopic && courseId && user) {
        setLoadingCount(true);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_count, chunkId, status] = await Promise.all([
            getTopicQuestionCount(courseId, selectedTopic.name),
            getFirstChunkIdForTopic(courseId, selectedTopic.name),
            getTopicCompletionStatus(user.id, courseId, selectedTopic.name)
        ]);
        
        setTargetChunkId(chunkId);
        setCompletionStatus(status);
        setLoadingCount(false);

        // Auto-Refill Trigger: Check and fill quota for this topic in background
        if (chunkId) {
             console.log(`[QuizModal] Triggering background check for chunk: ${chunkId}`);
             import('@/lib/ai/background-generator').then(({ checkAndTriggerBackgroundGeneration }) => {
                 checkAndTriggerBackgroundGeneration(chunkId, [], courseId, user.id);
             });
        }

      } else {
        setTargetChunkId(null);
        setCompletionStatus(null);
      }
    }
    loadData();
  }, [selectedTopic, courseId, user]);

  const handleStartQuiz = () => {
    // If completed is true, maybe block? But user might want to re-solve? 
    // Requirement: "Tebrikler" shows instead of Button. So user cannot start logic from here if completed.
    if (completionStatus?.completed) return; 
    setExistingQuestions([]);
    setIsQuizActive(true);
  };

  const handleBackToTopics = () => {
      setSelectedTopic(null);
      setIsQuizActive(false);
      setExistingQuestions([]);
      // Reload stats to reflect new progress
      if (courseId) {
          getCourseTopicsWithCounts(courseId).then(setTopics);
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            // Reset state on close
            setSelectedTopic(null);
            setIsQuizActive(false);
            setExistingQuestions([]);
        }
        onOpenChange(open);
    }}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-6 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Brain className="w-6 h-6" />
                </div>
                <div className="text-left">
                    <DialogTitle className="text-xl font-bold">{courseName}</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground flex items-center gap-2">
                        {isQuizActive ? (
                            <>
                                <span className="cursor-pointer hover:text-foreground transition-colors" onClick={handleBackToTopics}>Konu Listesi</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className="font-medium text-foreground">{selectedTopic?.name}</span>
                            </>
                        ) : "Konu Seçimi"}
                    </DialogDescription>
                </div>
            </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            {isQuizActive && selectedTopic ? (
                <div className="h-full overflow-y-auto p-6">
                    <QuizSessionProvider>
                        <QuizEngine 
                            chunkId={targetChunkId || undefined}
                            courseId={courseId}
                            courseName={courseName}
                            sectionTitle={selectedTopic.name}
                            content={targetChunkId ? undefined : " "} // Fallback if no chunk found
                            initialQuestions={existingQuestions}
                            onClose={handleBackToTopics} // Use handleBackTo refresh stats
                        />
                    </QuizSessionProvider>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 h-full">
                    {/* Left: Topic List */}
                    <div className="border-r border-border/40 overflow-y-auto p-4 space-y-2">
                        {loading ? (
                            <div className="flex items-center justify-center h-40 text-muted-foreground">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                Konular yükleniyor...
                            </div>
                        ) : topics.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-center p-4">
                                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                <p>Bu derse ait not bulunamadı.</p>
                            </div>
                        ) : (
                            topics.map((topic, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedTopic(topic)}
                                    className={`w-full text-left p-4 rounded-xl transition-all border ${
                                        selectedTopic?.name === topic.name 
                                            ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10 shadow-sm" 
                                            : "hover:bg-muted/50 border-transparent hover:border-border/50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <FileText className={`w-4 h-4 shrink-0 ${selectedTopic?.name === topic.name ? "text-primary" : "text-muted-foreground"}`} />
                                            <span className={`font-medium text-sm line-clamp-1 ${selectedTopic?.name === topic.name ? "text-foreground" : "text-muted-foreground"}`}>
                                                {topic.name}
                                            </span>
                                        </div>
                                        {/* Status Icon */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {topic.isCompleted && (
                                                <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span>Tamamlandı</span>
                                                </div>
                                            )}
                                            {selectedTopic?.name === topic.name && <ChevronRight className="w-4 h-4 text-primary shrink-0" />}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Right: Detail Panel */}
                    <div className="bg-muted/5 p-6 flex flex-col items-center justify-center h-full text-center">
                        {selectedTopic ? (
                            <div className="max-w-md w-full space-y-5 animate-in fade-in zoom-in-95 duration-200">
                                <div className="space-y-2">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                                        {completionStatus?.completed ? (
                                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                                        ) : (
                                            <FileText className="w-8 h-8" />
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-bold">{selectedTopic.name}</h3>
                                    
                                    {completionStatus?.completed ? (
                                        <div className="space-y-3">
                                            <h2 className="text-xl font-bold text-emerald-500">Tebrikler, konuyu tamamladınız!</h2>
                                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600">
                                                <p className="font-medium">Bu konudaki tüm antrenman sorularını bitirdiniz.</p>
                                                <p className="text-sm opacity-80 mt-1">Tekrar yapmak için arşiv modunu veya aralıklı tekrarı kullanabilirsiniz.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">
                                            Bu konuyla ilgili hedefiniz antrenman sorularını tamamlamak.
                                        </p>
                                    )}
                                </div>

                                {/* Stats Grid - Updated */}
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    {/* 1. Antrenman */}
                                    <div className="bg-background p-3 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center">
                                         <div className="text-xs text-muted-foreground mb-1 font-medium">Antrenman</div>
                                         <div className="text-lg font-bold flex items-baseline gap-1">
                                             <span className={completionStatus?.completed ? "text-emerald-500" : "text-primary"}>{completionStatus?.antrenman.solved || 0}</span>
                                             <span className="text-muted-foreground text-sm font-normal">/ {completionStatus?.antrenman.total || 0}</span>
                                         </div>
                                    </div>

                                    <div className="bg-background p-3 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center">
                                         <div className="text-xs font-medium text-red-500/80 mb-1">Hata Telafisi</div>
                                         <div className="text-lg font-bold flex items-baseline gap-1">
                                             <span className="text-red-500">{completionStatus?.mistakes.solved || 0}</span>
                                             <span className="text-muted-foreground text-sm font-normal">/ {completionStatus?.mistakes.total || 0}</span>
                                         </div>
                                    </div>
                                    
                                    {/* 3. Deneme */}
                                    <div className="bg-background p-3 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center opacity-80">
                                         <div className="text-xs text-muted-foreground mb-1 font-medium">Deneme</div>
                                         <div className="text-lg font-bold flex items-baseline gap-1">
                                             <span>{completionStatus?.deneme.solved || 0}</span>
                                             <span className="text-muted-foreground text-sm font-normal">/ {completionStatus?.deneme.total || 0}</span>
                                         </div>
                                    </div>

                                     {/* 4. Arşiv */}
                                     <div className="bg-background p-3 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center opacity-80">
                                         <div className="text-xs text-muted-foreground mb-1 font-medium">Arşiv</div>
                                         <div className="text-lg font-bold flex items-baseline gap-1">
                                             <span>{completionStatus?.arsiv.solved || 0}</span>
                                             <span className="text-muted-foreground text-sm font-normal">/ {completionStatus?.arsiv.total || 0}</span>
                                         </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 w-full">
                                    {!completionStatus?.completed && (
                                        <button
                                            onClick={handleStartQuiz}
                                            disabled={loadingCount}
                                            className="w-full py-4 bg-primary/70 text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loadingCount ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Hazırlanıyor...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-5 h-5" />
                                                    Soru Üret ve Başla
                                                </>
                                            )}
                                        </button>
                                    )}
                                    
                                    {completionStatus?.completed && (
                                         <button
                                            disabled
                                            className="w-full py-4 bg-muted text-muted-foreground rounded-xl font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed border border-border"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            Konu Tamamlandı
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground max-w-xs">
                                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <ChevronRight className="w-6 h-6 opacity-20" />
                                </div>
                                <p>Soru üretmek veya istatistikleri görmek için soldaki listeden bir konu seçin.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
