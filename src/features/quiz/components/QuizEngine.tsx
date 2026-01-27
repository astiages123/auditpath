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
import { useQuiz } from '@/features/quiz';
import { QuizCard } from './QuizCard';
import { QuizQuestion } from '@/features/quiz';
import { useQuizSession } from '../contexts/QuizSessionContext';
import { checkAndTriggerBackgroundGeneration } from '@/features/quiz';
import { QuizTimer } from './QuizTimer';
import { useAuth } from '@/features/auth';
import { PostTestDashboard } from './PostTestDashboard';
import { finishQuizSession } from '@/shared/lib/core/client-db';
import { calculateTestResults } from '@/shared/lib/utils/testResultCalculator';

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
  // onNextQuestion,
  onClose,
  courseId,
}: QuizEngineProps) {
  const {
    state,
    generateBatch,
    loadQuestions,
    nextQuestion,
    selectAnswer,
    toggleExplanation,
    // reset,
    retry,
    startQuiz,
  } = useQuiz();

  const { user } = useAuth();

  const { initializeSession, recordResponse, state: sessionState } = useQuizSession();

  const [count] = useState<number>(5); // Default to 5 questions
  const hasStartedAutoRef = useRef(false);
  const [results, setResults] = useState<QuizResults>({ correct: 0, incorrect: 0, blank: 0 });
  // ANOMALY-005 FIX: useRef ile güncel değerleri takip et (closure sorunu çözümü)
  const resultsRef = useRef<QuizResults>(results);
  const [isFinished, setIsFinished] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  
  // Track incorrect questions for follow-up generation
  const incorrectIdsRef = useRef<string[]>([]);
  const totalTimeRef = useRef<number>(0);
  
  // Timer state
  const startTimeRef = useRef<number>(0);

  // Initialize startTimeRef
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  // Reset timer when question changes
  useEffect(() => {
    if (state.currentQuestion) {
        startTimeRef.current = Date.now();
    }
  }, [state.currentQuestion?.id, state.currentQuestion]); // Use ID dependency to ensure reset on new question

  // Sync resultsRef with state (ANOMALY-005 FIX)
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  // Initialize Session
  useEffect(() => {
    if (courseId) {
        initializeSession(courseId);
    }
  }, [courseId, initializeSession]);

  const handleGenerate = useCallback(() => {
    if (chunkId) {
      generateBatch(count, { type: 'chunk', chunkId, userId: user?.id });
    } else if (courseName && sectionTitle && content) {
      generateBatch(count, { type: 'content', courseName, sectionTitle, content, courseId });
    }
  }, [chunkId, courseName, sectionTitle, content, generateBatch, count, courseId, user?.id]);

  // Auto-start generation when mounted with valid props
  useEffect(() => {
    if (!hasStartedAutoRef.current && !state.currentQuestion && !state.isLoading && !state.error && !initialQuestions?.length) {
        if (chunkId || (courseName && sectionTitle && content)) {
            hasStartedAutoRef.current = true;
            handleGenerate();
        }
    }
  }, [state.currentQuestion, state.isLoading, state.error, chunkId, courseName, sectionTitle, content, initialQuestions, handleGenerate]);

  // Load initial questions if provided
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
        loadQuestions(initialQuestions);
    }
  }, [initialQuestions, loadQuestions]);

  // const handleRestart = useCallback(() => {
  //   setIsFinished(false);
  //   setResults({ correct: 0, incorrect: 0, blank: 0 });
  //   reset();
  //   if (onNextQuestion) {
  //       onNextQuestion();
  //   }
  // }, [reset, onNextQuestion]);

  // Wrapper for answer selection to record data - NOW DEFERRED
  const handleSelectAnswer = useCallback((index: number) => {
    // 1. Update UI immediately
    selectAnswer(index);

    // 2. Update local results immediately (independent of DB)
    const question = state.currentQuestion;
    if (question) {
         const isCorrect = index === question.a;

         setResults(prev => ({
            ...prev,
            correct: isCorrect ? prev.correct + 1 : prev.correct,
            incorrect: !isCorrect ? prev.incorrect + 1 : prev.incorrect
         }));
         
         // NOTE: Removed recordResponse from here. Will be called on Next.
    }
  }, [selectAnswer, state.currentQuestion]);

  // Handle blank - skip question without answering
  const handleBlank = useCallback(async () => {
    // 1. Log and Record Response immediately
    const question = state.currentQuestion;
    if (question && question.id && courseId) {
        const timeSpent = Date.now() - startTimeRef.current;
        
        await recordResponse(
            question.id, 
            chunkId || null,
            'blank',
            null,
            timeSpent
        );
    }

    // 2. Update local results
    setResults(prev => ({ ...prev, blank: prev.blank + 1 }));

    // 3. Auto-advance immediately (skip explanation)
    if (state.queue.length > 0) {
      nextQuestion();
    } else {
       // Check if finished
       if (!state.isLoading && state.generatedCount === state.totalToGenerate) {
           setIsFinished(true);
       } else {
           nextQuestion(); // Wait/loading state
       }
    }
  }, [state, courseId, chunkId, recordResponse, nextQuestion]);

  const handleNext = useCallback(async () => {
    // 1. Record Response to DB
    const question = state.currentQuestion;
    if (question && question.id && courseId) {
        
        const validChunkId = chunkId || null;
        
        let responseType: 'correct' | 'incorrect' | 'blank' = 'blank';
        const selectedIndex = state.selectedAnswer;
        
        if (state.isAnswered) {
             if (state.selectedAnswer !== null) {
                  // Answered
                  responseType = state.isCorrect ? 'correct' : 'incorrect';
             } else {
                 // Blank (isAnswered=true but selectedAnswer=null handles blank state in hook)
                 responseType = 'blank';
             }
        }
        
        // Track incorrects
        if (responseType === 'incorrect') {
            incorrectIdsRef.current.push(question.id);
        }
        
        // If it was blank, selectedAnswer is null.
        
        const timeSpent = Date.now() - startTimeRef.current;
        totalTimeRef.current += timeSpent;

        await recordResponse(
            question.id, 
            validChunkId,
            responseType,
            selectedIndex,
            timeSpent
        );
    }

    // 2. Move to next question or finish
    if (state.queue.length > 0) {
      nextQuestion();
    } else {
      // If queue is empty but we are still loading (background generation), 
      // we should wait or show loading.
      // But typically queue fills up. 
      // If totalToGenerate > generatedCount, we might be waiting.
      // nextQuestion handles empty queue by setting current=null.
      // If we are finished logic:
      if (!state.isLoading && state.generatedCount === state.totalToGenerate) {
           setFinalTime(totalTimeRef.current);
           setIsFinished(true);
           
           // Finish Session Logic
           if (user?.id && courseId) {
                // 1. Save Session Reults
                // ANOMALY-005 FIX: resultsRef.current kullanarak güncel değerleri al
                await finishQuizSession({
                    totalQuestions: state.totalToGenerate,
                    correctCount: resultsRef.current.correct,
                    incorrectCount: resultsRef.current.incorrect,
                    blankCount: resultsRef.current.blank,
                    timeSpentMs: totalTimeRef.current,
                    courseId,
                    userId: user.id
                });
                
                // 2. Background Generation (Follow-up + Refill)
                if (chunkId && user?.id) {
                    checkAndTriggerBackgroundGeneration(chunkId, incorrectIdsRef.current);
                }
           }

      } else {
          // Waiting for more questions...
          nextQuestion(); // This will clear current and show "Waiting" state in UI if implemented
      }
    }
  }, [state, courseId, chunkId, recordResponse, nextQuestion, user]);

  // Handle start logic
  const handleStart = useCallback(() => {
    startQuiz();
  }, [startQuiz]);



  // If no question is loaded yet and we have params, show start button
  // Actually we auto-start now, so this might briefly flash or be hidden.
  // We can show a loading state immediately.
  // const showStartButton = false; 

  // If finished, show summary
  if (isFinished) {
    const summaryStats = calculateTestResults(
        results.correct,
        results.incorrect,
        results.blank,
        finalTime // Use state instead of ref
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
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            {state.queue.length > 0 ? `Sıradaki Soru (${state.queue.length})` : 'Testi Bitir'}
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default QuizEngine;
