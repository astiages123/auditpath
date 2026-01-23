"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Brain, FileText, ChevronRight, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { getTopicQuestionCount, getFirstChunkIdForTopic, getCourseTopicsWithCounts, TopicWithCounts, getTopicCompletionStatus, TopicCompletionStats } from "@/lib/client-db";
import { QuizEngine } from "@/components/features/quiz/QuizEngine";
import { QuizSessionProvider } from "@/components/features/quiz/QuizSessionProvider";
import { GenerateQuestionButton } from "@/components/features/quiz/GenerateQuestionButton";
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
  const [completionStatus, setCompletionStatus] = useState<TopicCompletionStats | null>(null);


  
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

        


        const chunkRes = await getFirstChunkIdForTopic(courseId, selectedTopic.name);
        setTargetChunkId(chunkRes);

        const [, status] = await Promise.all([
            getTopicQuestionCount(courseId, selectedTopic.name),
            getTopicCompletionStatus(user.id, courseId, selectedTopic.name)
        ]);
        
        setCompletionStatus(status);

        if (chunkRes) {
            // No longer checking generation status for automatic triggers
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
    // if (completionStatus?.completed) return; 
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
                <div className="grid md:grid-cols-[400px_1fr] h-full">
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
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 pt-0.5">
                                            <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${selectedTopic?.name === topic.name ? "text-primary" : "text-muted-foreground"}`} />
                                            <span className={`font-medium text-[15px] leading-snug ${selectedTopic?.name === topic.name ? "text-foreground" : "text-muted-foreground"}`}>
                                                {topic.name}
                                            </span>
                                        </div>
                                        {/* Status Icon */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {topic.isCompleted && (
                                                <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full text-[11px] font-bold">
                                                    <CheckCircle className="w-3.5 h-3.5" />
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
                    <div className="bg-muted/5 p-4 flex flex-col items-center justify-center h-full text-center">
                        {selectedTopic ? (
                            <div className="max-w-xl w-full space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                {/* Header: Icon + Title Horizontal - More Compact */}
                                <div className="flex items-center gap-3 px-4 text-left border-b border-border/10 pb-3 mb-1">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 text-primary">
                                        {completionStatus?.completed ? (
                                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                                        ) : (   
                                            <FileText className="w-6 h-6" />
                                        )}
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="text-lg font-bold leading-tight text-foreground">{selectedTopic.name}</h3>
                                        <p className="text-[13px] text-muted-foreground leading-none">
                                            {completionStatus?.completed 
                                                ? "Konu tamamlandı." 
                                                : "Hedef: Antrenman soruları."}
                                        </p>
                                    </div>
                                </div>

                                {completionStatus?.completed && (
                                    <div className="px-4 mb-1">
                                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 text-xs flex items-center gap-2">
                                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                            <p className="font-semibold text-left">Tüm antrenman soruları bitirildi.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Stats Grid - Balanced */}
                                <div className="grid grid-cols-2 gap-3 w-full px-2">
                                    {/* 1. Antrenman */}
                                    <div className="bg-background p-4 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                                         <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Antrenman</div>
                                         <div className="flex flex-col items-center gap-1">
                                            <div className="text-2xl font-bold flex items-baseline gap-1.5">
                                                <span className={completionStatus?.completed ? "text-emerald-500" : "text-primary"}>{completionStatus?.antrenman.solved || 0}</span>
                                                <span className="text-muted-foreground text-sm font-normal">/ {completionStatus?.antrenman.existing || 0}</span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/50">
                                                Hedef: {completionStatus?.antrenman.quota || 0}
                                            </div>
                                         </div>
                                    </div>

                                    {/* 2. Hata Telafisi */}
                                    <div className="bg-background p-4 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center">
                                         <div className="text-xs font-medium text-red-500/80 mb-2 uppercase tracking-wider">Hata Telafisi</div>
                                         <div className="flex flex-col items-center gap-1">
                                             <div className="text-2xl font-bold flex items-baseline gap-1.5">
                                                 <span className="text-red-500">{completionStatus?.mistakes.solved || 0}</span>
                                                 <span className="text-muted-foreground text-sm font-normal">/ {completionStatus?.mistakes.existing || 0}</span>
                                             </div>
                                         </div>
                                    </div>
                                    
                                    {/* 3. Deneme */}
                                    <div className="bg-background p-4 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center opacity-90">
                                         <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Deneme</div>
                                         <div className="flex flex-col items-center gap-1">
                                             <div className="text-2xl font-bold flex items-baseline gap-1.5">
                                                 <span>{completionStatus?.deneme.solved || 0}</span>
                                                 <span className="text-muted-foreground text-sm font-normal">/ {completionStatus?.deneme.existing || 0}</span>
                                             </div>
                                             <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/50">
                                                Hedef: {completionStatus?.deneme.quota || 0}
                                            </div>
                                         </div>
                                    </div>

                                     {/* 4. Arşiv */}
                                     <div className="bg-background p-4 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center opacity-90">
                                         <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Arşiv</div>
                                         <div className="flex flex-col items-center gap-1">
                                             <div className="text-2xl font-bold flex items-baseline gap-1.5">
                                                 <span>{completionStatus?.arsiv.solved || 0}</span>
                                                 <span className="text-muted-foreground text-sm font-normal">/ {completionStatus?.arsiv.existing || 0}</span>
                                             </div>
                                             <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/50">
                                                Hedef: {completionStatus?.arsiv.quota || 0}
                                            </div>
                                         </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 w-full px-2">
                                    {!completionStatus?.completed && (
                                        <>
                                            {(completionStatus?.antrenman.existing || 0) < (completionStatus?.antrenman.quota || 1) ? (
                                                targetChunkId && (
                                                    <div className="flex flex-col gap-3 items-center w-full py-4 border border-dashed border-border/50 rounded-xl bg-muted/20">
                                                        <p className="text-sm text-muted-foreground text-center px-4">
                                                            Bu konuda henüz yeterli soru yok. Üretmek için aşağıdaki butona tıklayın.
                                                        </p>
                                                        <GenerateQuestionButton 
                                                            chunkId={targetChunkId} 
                                                            onComplete={async () => {
                                                                // Reload completion status after generation
                                                                if (user && courseId && selectedTopic) {
                                                                    const newStatus = await getTopicCompletionStatus(user.id, courseId, selectedTopic.name);
                                                                    setCompletionStatus(newStatus);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                )
                                            ) : (
                                                <button
                                                    onClick={handleStartQuiz}
                                                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                                >
                                                    <Brain className="w-5 h-5" />
                                                    Antrenmana Başla
                                                </button>
                                            )}
                                        </>
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
