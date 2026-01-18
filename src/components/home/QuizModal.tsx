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
  // const [questionCount, setQuestionCount] = useState<number | null>(null); 
  // const [_questionCount, setQuestionCount] = useState<number | null>(null);
  const [completionStatus, setCompletionStatus] = useState<{ completed: boolean; total: number; solved: number } | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  
  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>([]);
  // const [_loadingExisting, setLoadingExisting] = useState(false);
  
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
        // setQuestionCount(count);
        setTargetChunkId(chunkId);
        setCompletionStatus(status);
        setLoadingCount(false);
      } else {
        // setQuestionCount(null);
        setTargetChunkId(null);
        setCompletionStatus(null);
      }
    }
    loadData();
  }, [selectedTopic, courseId, user]);

  const handleStartQuiz = () => {
    if (completionStatus?.completed) return; // Guard clause
    setExistingQuestions([]);
    setIsQuizActive(true);
  };

  // const handleSolveExisting = async () => {
  //   if (!selectedTopic || !courseId) return;
    
  //   setLoadingExisting(true);
  //   const questions = await getTopicQuestions(courseId, selectedTopic.name);
  //   setExistingQuestions(questions);
  //   setLoadingExisting(false);
  //   setIsQuizActive(true);
  // };

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
                                        {/* Question Counts */}
                                        <div className="flex items-center gap-2 shrink-0">
                                             {topic.counts.total > 0 && (
                                                <div className="flex gap-1 text-[10px] items-center text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
                                                    {topic.counts.antrenman > 0 && <span title="Antrenman">A:{topic.counts.antrenman}</span>}
                                                    {topic.counts.arsiv > 0 && <span title="Arşiv">Ar:{topic.counts.arsiv}</span>}
                                                    {topic.counts.deneme > 0 && <span title="Deneme">D:{topic.counts.deneme}</span>}
                                                    <span className="font-bold border-l border-border pl-1 ml-1" title="Toplam">{topic.counts.total}</span>
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
                    <div className="bg-muted/5 p-8 flex flex-col items-center justify-center text-center">
                        {selectedTopic ? (
                            <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-200">
                                <div className="space-y-2">
                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                                        {completionStatus?.completed ? (
                                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                                        ) : (
                                            <FileText className="w-8 h-8" />
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-bold">{selectedTopic.name}</h3>
                                    
                                    {completionStatus?.completed ? (
                                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600">
                                            <p className="font-medium">Bu konudaki tüm antrenman sorularını tamamladınız.</p>
                                            <p className="text-sm opacity-80 mt-1">Soru havuzu sıfırlandı, artık tekrar için aralıklı tekrar modunu kullanabilirsiniz.</p>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">
                                            Bu konuyla ilgili soru üretmek için hazırsınız.
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-background p-4 rounded-xl border border-border/50 shadow-sm">
                                        <div className="text-sm text-muted-foreground mb-1">Çözülen / Toplam</div>
                                        <div className="text-2xl font-bold">
                                            {loadingCount ? (
                                                <Loader2 className="w-5 h-5 animate-spin inline-block" />
                                            ) : (
                                                <>
                                                 <span className={completionStatus?.completed ? "text-emerald-500" : ""}>{completionStatus?.solved || 0}</span>
                                                 <span className="text-muted-foreground text-lg ml-1">/ {completionStatus?.total || 0}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-background p-4 rounded-xl border border-border/50 shadow-sm">
                                        <div className="text-sm text-muted-foreground mb-1">Ders Notu</div>
                                        <div className="text-2xl font-bold text-green-500">Aktif</div>
                                    </div>
                                </div>

                             <div className="flex flex-col gap-3 w-full">
                                    {/* Existing questions button removed as logic is now purely generation vs completion */}
                                    {/* However, if there are questions but not complete, we might want to continue? 
                                        Actually, "Yeni Soru Üret" continues generating until completion. 
                                        So we just need the Generate button.
                                        But if user wants to review old questions? Maybe accessing Archive? 
                                        For now, keeping it simple as per request: Training first.
                                    */}

                                    {!completionStatus?.completed && (
                                        <button
                                            onClick={handleStartQuiz}
                                            disabled={loadingCount}
                                            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                            className="w-full py-4 bg-muted text-muted-foreground rounded-xl font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed"
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
