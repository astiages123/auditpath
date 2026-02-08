/**
 * QuizEngine Component
 *
 * Main orchestrator for the quiz flow:
 * - Handles question generation triggers
 * - Manages quiz state via useQuiz hook
 * - Provides navigation and control buttons
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuiz } from '../../hooks/useQuiz';
import { QuizCard } from '../ui/QuizCard';
import { QuizQuestion } from '../../api/solve-quiz.api';
import { useQuizSession } from '../../../../contexts/QuizSessionContext';
import { checkAndTriggerBackgroundGeneration, generateFollowUpSingle } from '@/features/quiz';
import { QuizTimer } from '../ui/QuizTimer';
import { useAuth } from '@/features/auth';
import { PostTestDashboard } from './PostTestDashboard';
import { finishQuizSession } from '@/shared/lib/core/client-db';
import { calculateTestResults } from '@/features/quiz/tasks/solve-quiz/internals/test-result-calculator';

interface QuizEngineProps {
  /** Note chunk ID for generating questions */
  chunkId?: string;
  /** Direct content for generating questions (alternative to chunkId) */
  courseName?: string;
  sectionTitle?: string;
  content?: string;
  /** Pre-loaded questions to solve */
  initialQuestions?: QuizQuestion[];
  /** Called when user wants to generate another question */
  onNextQuestion?: () => void;
  /** Called when user wants to close the quiz */
  onClose?: () => void;
  /** Course ID for session management */
  courseId?: string;
}

interface QuizResults {
  correct: number;
  incorrect: number;
  blank: number;
}

export function QuizEngine({
  chunkId,
  courseName,
  sectionTitle,
  content,
  initialQuestions,
  onClose,
  courseId,
}: QuizEngineProps) {
  const { user } = useAuth();
  const { initializeSession, recordResponse, state: sessionState, injectScaffolding } = useQuizSession();

  // Connect SolveQuizService to useQuizSession's recordResponse
  const {
    state,
    results,
    generateBatch,
    loadQuestions,
    nextQuestion,
    selectAnswer,
    toggleExplanation,
    reset,
    retry,
    startQuiz,
    markAsBlank,
  } = useQuiz({
    recordResponse: async (qId, type, answer, time, diag, ins) => {
        return recordResponse(qId, chunkId || null, type, answer, time, diag, ins);
    }
  });

  const [count] = useState<number>(5);
  const hasStartedAutoRef = useRef(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track incorrect questions for follow-up generation
  const incorrectIdsRef = useRef<string[]>([]);
  
  // Connect recordResponse to the hook/service via useEffect
  // For now, let's keep it manual in handleSelectAnswer and handleBlank if service doesn't have it.
  // Wait, I added recordResponse to service callbacks! I just need to pass it in useQuiz.

  // Initialize Session
  useEffect(() => {
    if (courseId) {
        initializeSession(courseId);
    }
  }, [courseId, initializeSession]);

  const handleGenerate = useCallback(() => {
    if (chunkId && user?.id) {
        generateBatch(count, { type: 'chunk', chunkId, userId: user.id });
    }
  }, [chunkId, generateBatch, count, user?.id]);

  // Auto-start generation
  useEffect(() => {
    if (!hasStartedAutoRef.current && !state.currentQuestion && !state.isLoading && !state.error && !initialQuestions?.length) {
        if (chunkId || (courseName && sectionTitle && content)) {
            hasStartedAutoRef.current = true;
            handleGenerate();
        }
    }
  }, [state.currentQuestion, state.isLoading, state.error, chunkId, courseName, sectionTitle, content, initialQuestions, handleGenerate]);

  // Load initial questions
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
        loadQuestions(initialQuestions);
    }
  }, [initialQuestions, loadQuestions]);

  const handleSelectAnswer = useCallback(async (index: number) => {
    if (state.isAnswered || !state.currentQuestion) return;
    
    // 1. Process via service/hook
    selectAnswer(index);

    const isCorrect = index === state.currentQuestion.a;
    
    // 2. Local side effects (scaffolding)
    if (!isCorrect && user?.id && courseId && chunkId) {
        incorrectIdsRef.current.push(state.currentQuestion.id!);
        // Scaffolding logic kept here for UI (toasts)
        toast.loading("Hatayı analiz ediyorum...", { id: "scaffold-gen" });
        try {
            const context = {
                chunkId,
                originalQuestion: { ...state.currentQuestion, concept: (state.currentQuestion as any).concept_title || (state.currentQuestion as any).concept },
                incorrectOptionIndex: index,
                correctOptionIndex: state.currentQuestion.a,
                courseId,
                userId: user.id
            };
            const scaffoldId = await generateFollowUpSingle(context as any, console.log);
            if (scaffoldId) {
                injectScaffolding(scaffoldId, chunkId);
                toast.success("Telafi sorusu hazırlandı.", { id: "scaffold-gen" });
            }
        } catch (e) {
            console.error("Scaffold gen failed", e);
        }
        setTimeout(() => toast.dismiss("scaffold-gen"), 2000);
    }
  }, [selectAnswer, state, user, courseId, chunkId, injectScaffolding]);

  const handleBlank = useCallback(async () => {
    markAsBlank();
  }, [markAsBlank]);

  const handleNext = useCallback(async () => {
    if (isSubmitting || !user?.id || !courseId) return;
    setIsSubmitting(true);
    try {
        await nextQuestion(user.id, courseId);
    } finally {
        setIsSubmitting(false);
    }
  }, [nextQuestion, user?.id, courseId, isSubmitting]);

  // Check for finish
  useEffect(() => {
    if (state.hasStarted && !state.isLoading && !state.currentQuestion && state.queue.length === 0 && state.generatedCount > 0) {
        setIsFinished(true);
        if (chunkId && user?.id) {
           checkAndTriggerBackgroundGeneration(chunkId, incorrectIdsRef.current);
        }
    }
  }, [state, chunkId, user?.id]);

  const handleStart = useCallback(() => {
    startQuiz();
  }, [startQuiz]);

  // If finished, show summary
  if (isFinished) {
    const summaryStats = calculateTestResults(
        results.correct,
        results.incorrect,
        results.blank,
        results.totalTimeMs
    );

    return (
        <PostTestDashboard
            results={summaryStats}
            onClose={() => {
                onClose?.();
                // Optionally reset local state if needed, but component unmounts usually
            }}
        />
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Start Button & Controls - REMOVED for auto-start flow */}


      {/* Loading State with Progress */}
      {(state.isLoading || (!sessionState.isInitialized && !sessionState.error)) && (
        <div className="text-center py-12 space-y-4">
           <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
           <div className="space-y-1">
             <h3 className="text-lg font-medium text-white">
               {state.isLoading ? 'Sorular Hazırlanıyor...' : 'Oturum Hazırlanıyor...'}
             </h3>
             {state.isLoading && state.totalToGenerate > 0 && (
               <p className="text-muted-foreground">
                 {state.generatedCount} / {state.totalToGenerate} tamamlanıyor
               </p>
             )}
           </div>
        </div>
      )}

      {/* Ready to Start State */}
      {!state.isLoading && !state.hasStarted && sessionState.isInitialized && !sessionState.error && state.queue.length > 0 && ( // Also check if we have questions
         <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 space-y-6"
         >
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto ring-1 ring-primary/50">
               <ArrowRight className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Hazır mısın?</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    {state.generatedCount} adet antrenman sorusu hazırlandı. Başlamaya hazır olduğunda butona bas.
                </p>
            </div>
            <button
                onClick={handleStart}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25"
            >
                Antrenmanı Başlat
            </button>
         </motion.div>
      )}

      {/* Session Error */}
      {sessionState.error && (
        <div className="text-center py-12 space-y-4">
           <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
             <RotateCcw className="w-6 h-6 text-red-500" />
           </div>
           <div className="space-y-1">
             <h3 className="text-lg font-medium text-red-500">Oturum Hatası</h3>
             <p className="text-muted-foreground max-w-sm mx-auto">
               {sessionState.error}
             </p>
             <button 
                onClick={() => courseId && initializeSession(courseId)}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
             >
                Tekrar Dene
             </button>
           </div>
        </div>
      )}

      {/* Quiz Card - SHOW ONLY IF STARTED */}
      {!state.isLoading && sessionState.isInitialized && !sessionState.error && state.hasStarted && (
        <div className="space-y-6">
           {/* Stats Header */}
           {sessionState.courseStats && (
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl border border-border/50">
                  <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Toplam Çözülen</span>
                          <span className="text-lg font-bold text-primary">{sessionState.courseStats.totalQuestionsSolved} Soru</span>
                      </div>
                      <div className="w-px h-8 bg-border/50" />
                      <div className="flex flex-col">
                           <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Ortalama Başarı</span>
                           <span className="text-lg font-bold text-emerald-500">%{sessionState.courseStats.averageMastery}</span>
                      </div>
                  </div>
                   {/* Session Progress */}
                  <div className="text-right flex flex-col items-end gap-1">
                       <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Oturum</span>
                       <div className="text-sm font-medium">Soru {state.generatedCount + 1} / {state.totalToGenerate}</div>
                       <QuizTimer 
                          key={state.currentQuestion?.id ?? 'timer'}
                          isRunning={!state.isAnswered && !state.isLoading} 
                       />
                  </div>
              </div>
           )}

            <QuizCard
              question={state.currentQuestion}
              selectedAnswer={state.selectedAnswer}
              isAnswered={state.isAnswered}
              isCorrect={state.isCorrect}
              showExplanation={state.showExplanation}
              isLoading={false} // Handled above
              error={state.error}
              onSelectAnswer={handleSelectAnswer}
              onToggleExplanation={toggleExplanation}
              onRetry={retry}
              onBlank={handleBlank}
              courseId={courseId}
            />
        </div>
      )}

      {/* Action Buttons - shown after answering */}
      {state.isAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row gap-3"
        >
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-primary-foreground rounded-xl font-medium transition-colors ${
              isSubmitting ? 'bg-primary/70 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
            {isSubmitting
              ? 'İşleniyor...'
              : state.queue.length > 0
              ? `Sıradaki Soru (${state.queue.length})`
              : 'Testi Bitir'}
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default QuizEngine;
