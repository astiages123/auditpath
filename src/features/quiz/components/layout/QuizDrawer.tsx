import { useEffect } from 'react';
import { ArrowLeft, BookOpen, X } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { ErrorBoundary } from '@/components/ui/error-boundary';

import {
  useQuizManager,
  QUIZ_PHASE,
} from '@/features/quiz/hooks/useQuizManager';
import {
  InitialStateView,
  CourseOverview,
} from '@/features/quiz/components/views/QuizIntroViews';
import { MappingProgressView } from '@/features/quiz/components/views/MappingProgressView';
import { BriefingView } from '@/features/quiz/components/views/BriefingView';
import { QuizContainer } from '@/features/quiz/components/layout/QuizContainer';

// === TYPES ===

interface QuizDrawerProps {
  /** Drawer'ın görünürlük durumu */
  isOpen: boolean;
  /** Kapatma butonu tıklandığında tetiklenen handler */
  onClose: () => void;
  /** Dersin benzersiz kimliği */
  courseId: string;
  /** Dersin slug değeri (URL uyumlu isim) */
  courseSlug: string;
  /** Dersin adı */
  courseName: string;
  /** Opsiyonel: Başlangıçta seçilmesi istenen chunk ID */
  initialChunkId?: string;
  /** Opsiyonel: Başlangıçta seçilmesi istenen konu adı */
  initialTopicName?: string;
}

// === COMPONENT ===

/**
 * Sınav Merkezi'nin ana kaplayıcısı (Drawer).
 * Quiz akışını (konu seçimi, analiz, briefing ve quiz) yönetir.
 */
export function QuizDrawer({
  isOpen,
  onClose,
  courseId,
  courseName,
  initialTopicName,
}: QuizDrawerProps) {
  // === HOOKS ===

  const {
    topics,
    selectedTopic,
    setSelectedTopic,
    chunkId,
    completionStatus,
    isQuizActive,
    quizPhase,
    examLogs,
    examProgress,
    handleStartQuiz,
    handleGenerate,
    handleStopGeneration,
    handleFinishQuiz,
    courseProgress,
    resetState,
  } = useQuizManager({ isOpen, courseId, courseName });

  // === SIDE EFFECTS ===

  // Belirli bir konu adı ile açıldığında otomatik seçim yap
  useEffect(() => {
    if (isOpen && initialTopicName && topics.length > 0) {
      const match = topics.find((t) => t.name === initialTopicName);
      if (match) setSelectedTopic(match);
    }
  }, [isOpen, topics, initialTopicName, setSelectedTopic]);

  // Arka plan kaydırmayı engelle (scroll lock)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // === HANDLERS ===

  /** Drawer'ı tamamen kapatır ve durumu sıfırlar */
  const handleClose = () => {
    resetState();
    setSelectedTopic(null);
    onClose();
  };

  /** Quiz bitince ana menüye döner */
  const handleBack = async () => {
    await handleFinishQuiz();
    setSelectedTopic(null);
    handleClose();
  };

  // === RENDER LOGIC ===

  if (!isOpen) return null;

  // === RENDER ===

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-background flex flex-col',
        'animate-in fade-in duration-200'
      )}
    >
      {/* --- ÜST ÇUBUK (TOP BAR) --- */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-border/20 bg-background/95 backdrop-blur-md">
        {/* Sol: Geri Dön butonu */}
        <button
          onClick={handleClose}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Notlara Dön</span>
        </button>

        {/* Orta: Mevcut Başlık */}
        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-black uppercase tracking-wider text-foreground truncate">
            {selectedTopic ? selectedTopic.name : courseName}
          </p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Sınav Merkezi
          </p>
        </div>

        {/* Sağ: Kapat butonu */}
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* --- ANA İÇERİK --- */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col min-h-0 flex-1 bg-card rounded-xl border overflow-hidden h-full mx-2 lg:mx-4 my-4">
          <ErrorBoundary>
            {isQuizActive && selectedTopic ? (
              <QuizContainer
                chunkId={chunkId || undefined}
                courseId={courseId}
                onClose={handleBack}
              />
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Alt Header (Seçili Konu Bilgisi) */}
                <div className="group flex flex-col border-b border-border/10 shrink-0 bg-card/80 backdrop-blur-md z-10 transition-all duration-300">
                  <div className="flex items-center gap-3 px-6 py-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {selectedTopic ? selectedTopic.name : courseName}
                      </h3>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                        Sınav Merkezi
                      </p>
                    </div>
                  </div>
                </div>

                {/* İçerik Panel / Scroll Alanı */}
                <div className="flex-1 min-h-0 p-4 lg:p-6 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar mx-auto w-full">
                  <div className="w-full flex-1 flex flex-col min-h-0 mx-auto transition-all duration-300 max-w-3xl">
                    {selectedTopic ? (
                      <div className="flex-1 flex flex-col min-h-0">
                        {/* 1. FAZ: Başlangıç / Analiz Bekleme */}
                        {quizPhase === QUIZ_PHASE.NOT_ANALYZED && (
                          <InitialStateView onGenerate={handleGenerate} />
                        )}

                        {/* 2. FAZ: Analiz / Haritalama Süreci */}
                        {quizPhase === QUIZ_PHASE.MAPPING && (
                          <MappingProgressView
                            examProgress={examProgress}
                            examLogs={examLogs}
                            onCancel={handleStopGeneration}
                          />
                        )}

                        {/* 3. FAZ: Briefing / Başlatma Öncesi */}
                        {quizPhase === QUIZ_PHASE.BRIEFING &&
                          completionStatus && (
                            <BriefingView
                              completionStatus={completionStatus}
                              onStartQuiz={handleStartQuiz}
                            />
                          )}
                      </div>
                    ) : (
                      /* Konu Seçilmemişse: Kurs Genel Görünümü */
                      <CourseOverview
                        courseName={courseName}
                        progress={courseProgress}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
