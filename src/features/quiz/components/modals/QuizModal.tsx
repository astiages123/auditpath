'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import {
  Brain,
  FileText,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  getTopicQuestionCount,
  getFirstChunkIdForTopic,
  getCourseTopicsWithCounts,
  TopicWithCounts,
  getTopicCompletionStatus,
  TopicCompletionStats,
} from '@/shared/lib/core/client-db';
import { QuizEngine } from '../engine/QuizEngine';
import {
  QuizSessionProvider,
  ExamService,
  type QuizQuestion,
} from '@/features/quiz';
import { GenerateQuestionButton } from '../ui/GenerateQuestionButton';
import { useAuth } from '@/features/auth';
import * as Repository from '@/features/quiz/api/repository';
import { type GenerationLog } from '@/features/quiz/core/factory';
interface QuizModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
}

export function QuizModal({
  isOpen,
  onOpenChange,
  courseId,
  courseName,
}: QuizModalProps) {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicWithCounts[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithCounts | null>(
    null
  );
  const [targetChunkId, setTargetChunkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Status State
  const [completionStatus, setCompletionStatus] =
    useState<TopicCompletionStats | null>(null);

  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>(
    []
  );

  // Quiz Engine State
  const [isQuizActive, setIsQuizActive] = useState(false);

  // Exam Generation State
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [examLogs, setExamLogs] = useState<GenerationLog[]>([]);
  const [examProgress, setExamProgress] = useState({ current: 0, total: 0 });

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
        const chunkRes = await getFirstChunkIdForTopic(
          courseId,
          selectedTopic.name
        );
        setTargetChunkId(chunkRes);

        const [, status] = await Promise.all([
          getTopicQuestionCount(courseId, selectedTopic.name),
          getTopicCompletionStatus(user.id, courseId, selectedTopic.name),
        ]);

        setCompletionStatus(status);
        console.log('DEBUG - Quiz Topic Status:', {
          topic: selectedTopic.name,
          antrenman_quota: status.antrenman.quota,
          status_object: status,
        });

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
    setIsGeneratingExam(false);
    setExamLogs([]);
    setExistingQuestions([]);
    // Reload stats to reflect new progress
    if (courseId) {
      getCourseTopicsWithCounts(courseId).then(setTopics);
    }
  };

  const handleStartSmartExam = async () => {
    if (!user || !courseId || !courseName) return;

    setIsGeneratingExam(true);
    setExamLogs([]);
    setExamProgress({ current: 0, total: 0 });

    try {
      const result = await ExamService.generateSmartExam(
        courseId,
        courseName,
        user.id,
        {
          onLog: (log: GenerationLog) =>
            setExamLogs((prev) => [log, ...prev].slice(0, 50)),
          onQuestionSaved: (count: number) =>
            setExamProgress((prev) => ({ ...prev, current: count })),
          onComplete: () => {},
          onError: (err: Error) => {
            console.error('Exam generation error:', err);
          },
        }
      );

      if (result.success && result.questionIds.length > 0) {
        // Fetch the questions to pass to QuizEngine
        const questionsData = await Repository.fetchQuestionsByIds(
          result.questionIds
        );

        if (questionsData) {
          const formattedQuestions = questionsData.map((q) => {
            const data = q.question_data as unknown as QuizQuestion;
            return {
              ...data,
              id: q.id,
            };
          }) as QuizQuestion[];

          setExistingQuestions(formattedQuestions);
          // Create a "Dummy Topic" for display
          setSelectedTopic({
            name: 'Karma Deneme Sınavı',
            questionCount: formattedQuestions.length,
            isCompleted: false,
          } as unknown as TopicWithCounts);
          setIsQuizActive(true);
        }
      }
    } catch (error) {
      console.error('Failed to start smart exam:', error);
    } finally {
      setIsGeneratingExam(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // Reset state on close
          setSelectedTopic(null);
          setIsQuizActive(false);
          setExistingQuestions([]);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <div className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-6 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Brain className="w-6 h-6" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-bold">
                  {courseName}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground flex items-center gap-2">
                  {isQuizActive ? (
                    <>
                      <span
                        className="cursor-pointer hover:text-foreground transition-colors"
                        onClick={handleBackToTopics}
                      >
                        Konu Listesi
                      </span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="font-medium text-foreground">
                        {selectedTopic?.name}
                      </span>
                    </>
                  ) : (
                    'Konu Seçimi'
                  )}
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
                    content={targetChunkId ? undefined : ' '} // Fallback if no chunk found
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
                            ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10 shadow-sm'
                            : 'hover:bg-muted/50 border-transparent hover:border-border/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 pt-0.5">
                            <FileText
                              className={`w-4 h-4 shrink-0 mt-0.5 ${selectedTopic?.name === topic.name ? 'text-primary' : 'text-muted-foreground'}`}
                            />
                            <span
                              className={`font-medium text-[15px] leading-snug ${selectedTopic?.name === topic.name ? 'text-foreground' : 'text-muted-foreground'}`}
                            >
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
                            {selectedTopic?.name === topic.name && (
                              <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                            )}
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
                        <div className="space-y-0.5 w-full">
                          <div className="flex items-center justify-between w-full">
                            <h3 className="text-lg font-bold leading-tight text-foreground">
                              {selectedTopic.name}
                            </h3>
                            {completionStatus?.importance && (
                              <div
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  completionStatus.importance === 'high'
                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    : completionStatus.importance === 'medium'
                                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                      : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                }`}
                              >
                                {completionStatus.importance === 'high'
                                  ? 'Yüksek'
                                  : completionStatus.importance === 'medium'
                                    ? 'Orta'
                                    : 'Düşük'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {completionStatus?.completed && (
                        <div className="px-4 mb-1">
                          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 text-xs flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                            <p className="font-semibold text-left">
                              Tüm antrenman soruları bitirildi.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Stats Grid - Balanced */}
                      <div className="grid grid-cols-2 gap-3 w-full px-2">
                        {/* 1. Antrenman */}
                        <div className="bg-background p-4 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                          <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                            Antrenman
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-2xl font-bold flex items-baseline gap-1.5">
                              <span
                                className={
                                  completionStatus?.completed
                                    ? 'text-emerald-500'
                                    : 'text-primary'
                                }
                              >
                                {completionStatus?.antrenman.solved || 0}
                              </span>
                              <span className="text-muted-foreground text-sm font-normal">
                                / {completionStatus?.antrenman.existing || 0}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/50">
                              Hedef: {completionStatus?.antrenman.quota || 0}
                            </div>
                          </div>
                        </div>

                        {/* 2. Hata Telafisi */}
                        <div className="bg-background p-4 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center">
                          <div className="text-xs font-medium text-red-500/80 mb-2 uppercase tracking-wider">
                            Hata Telafisi
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-2xl font-bold flex items-baseline gap-1.5">
                              <span className="text-red-500">
                                {completionStatus?.mistakes.solved || 0}
                              </span>
                              <span className="text-muted-foreground text-sm font-normal">
                                / {completionStatus?.mistakes.existing || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Deneme */}
                        <div className="bg-background p-4 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center opacity-90">
                          <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                            Deneme
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-2xl font-bold flex items-baseline gap-1.5">
                              {completionStatus?.deneme.existing === 0 ? (
                                <span className="text-sm font-bold text-primary/80 text-center leading-tight">
                                  Stratejik Üretim Hazır
                                </span>
                              ) : (
                                <>
                                  <span>
                                    {completionStatus?.deneme.solved || 0}
                                  </span>
                                  <span className="text-muted-foreground text-sm font-normal">
                                    / {completionStatus?.deneme.existing || 0}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/50">
                              Hedef: {completionStatus?.examTarget || 4}
                            </div>
                          </div>
                        </div>

                        {/* 4. Arşiv */}
                        <div className="bg-background p-4 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center opacity-90">
                          <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                            Arşiv
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex flex-col items-center">
                              {completionStatus?.arsiv.srsDueCount === 0 ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-sm font-bold text-emerald-500 uppercase">
                                    Hafıza Taze
                                  </span>
                                  <div className="w-8 h-1 bg-emerald-500/20 rounded-full" />
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-lg font-bold text-amber-500">
                                    {completionStatus?.arsiv.srsDueCount}
                                  </span>
                                  <span className="text-[10px] font-bold text-amber-600 uppercase">
                                    Soru Tozlandı
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 w-full px-2">
                        {!completionStatus?.completed && (
                          <>
                            {(completionStatus?.antrenman.existing || 0) <
                            (completionStatus?.antrenman.quota || 1) ? (
                              targetChunkId && (
                                <div className="flex flex-col gap-3 items-center w-full py-4 border border-dashed border-border/50 rounded-xl bg-muted/20">
                                  <p className="text-sm text-muted-foreground text-center px-4">
                                    Bu konuda henüz yeterli soru yok. Üretmek
                                    için aşağıdaki butona tıklayın.
                                  </p>
                                  <GenerateQuestionButton
                                    chunkId={targetChunkId}
                                    onOpenChange={() => {}}
                                    externalStats={
                                      completionStatus?.antrenman
                                        ? {
                                            existing:
                                              completionStatus.antrenman.existing,
                                            quota:
                                              completionStatus.antrenman.quota,
                                          }
                                        : undefined
                                    }
                                    onComplete={async () => {
                                      // Reload completion status after generation
                                      if (user && courseId && selectedTopic) {
                                        const newStatus =
                                          await getTopicCompletionStatus(
                                            user.id,
                                            courseId,
                                            selectedTopic.name
                                          );
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
                    <div className="flex flex-col items-center justify-center h-full w-full max-w-2xl mx-auto space-y-8 p-8">
                      {!isGeneratingExam ? (
                        <>
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                            <div className="w-24 h-24 bg-zinc-900 border border-white/10 rounded-3xl flex items-center justify-center relative shadow-2xl">
                              <Brain className="w-12 h-12 text-primary" />
                            </div>
                          </div>

                          <div className="space-y-4 text-center">
                            <h2 className="text-3xl font-black text-white tracking-tight">
                              Zeki Deneme Sınavı
                            </h2>
                            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                              SAK algoritması ile o anki ilerlemene ve dersin
                              sınav önemine göre sana özel bir deneme
                              hazırlayalım.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                              <div className="text-[10px] font-bold text-primary uppercase tracking-widest">
                                Yapay Zeka
                              </div>
                              <div className="text-sm font-semibold text-white">
                                Terzi Dikimi
                              </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                Algoritma
                              </div>
                              <div className="text-sm font-semibold text-white">
                                SAK Odaklı
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={handleStartSmartExam}
                            className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3"
                          >
                            <Brain className="w-6 h-6" />
                            Karma Deneme Çöz
                          </button>

                          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">
                            DENEME SINAVI AKIŞI • 20 SORULUK SETLER
                          </p>
                        </>
                      ) : (
                        <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
                          <div className="flex flex-col items-center text-center space-y-4">
                            <div className="relative">
                              <Loader2 className="w-16 h-16 text-primary animate-spin" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold text-white bg-zinc-900 rounded-full w-8 h-8 flex items-center justify-center border border-white/10">
                                  {Math.round(
                                    (examProgress.current /
                                      (examProgress.total || 1)) *
                                      100
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-xl font-bold text-white">
                                Deneme Sınavın Hazırlanıyor
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                SAK Algoritması dersini analiz ediyor...
                              </p>
                            </div>
                          </div>

                          {/* Console Style Log Viewer */}
                          <div className="w-full h-48 bg-black/60 rounded-2xl border border-white/10 p-4 font-mono text-[10px] overflow-hidden flex flex-col-reverse shadow-inner">
                            {examLogs.map((log) => (
                              <div
                                key={log.id}
                                className="flex gap-3 mb-1.5 opacity-80 border-b border-white/5 pb-1"
                              >
                                <span className="text-zinc-600">
                                  [
                                  {log.timestamp.toLocaleTimeString([], {
                                    hour12: false,
                                  })}
                                  ]
                                </span>
                                <span
                                  className={
                                    log.step === 'ERROR'
                                      ? 'text-red-400'
                                      : log.step === 'COMPLETED'
                                        ? 'text-emerald-400'
                                        : 'text-primary'
                                  }
                                >
                                  {log.step}
                                </span>
                                <span className="text-white shrink-0 font-bold">
                                  {log.message}
                                </span>
                                {log.details &&
                                  Object.keys(log.details).length > 0 && (
                                    <span className="text-zinc-500 italic truncate">
                                      {JSON.stringify(log.details)}
                                    </span>
                                  )}
                              </div>
                            ))}
                            {examLogs.length === 0 && (
                              <div className="text-zinc-700 animate-pulse">
                                Initializing SAK engine...
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-center gap-2">
                            <div className="flex gap-1">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="w-1 h-1 rounded-full bg-primary animate-bounce"
                                  style={{ animationDelay: `${i * 0.2}s` }}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
                              Motor Hazırlanıyor
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
